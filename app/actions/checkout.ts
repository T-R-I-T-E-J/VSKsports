"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCart } from "@/lib/cart";
import { computeTotals, type ShippingMethod } from "@/lib/pricing";
import {
  razorpay,
  isRazorpayConfigured,
  verifyPaymentSignature,
  RAZORPAY_KEY_ID,
} from "@/lib/razorpay";
import { sendOrderConfirmationEmail } from "@/lib/email/mailer";

async function uniqueOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  for (let i = 0; i < 6; i++) {
    const n = `VSK-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
    const exists = await prisma.order.findUnique({ where: { number: n } });
    if (!exists) return n;
  }
  return `VSK-${year}-${Date.now()}`;
}

/**
 * SECURITY: Server Action arguments are attacker-controlled and TypeScript
 * types are erased at runtime, so `shipping` arrives as an arbitrary value.
 * `shippingCost()` treats anything it doesn't recognise as "standard", which
 * hides the bad input instead of rejecting it. Pin it to the three methods the
 * UI actually offers so the stored order can never be priced off an
 * unrecognised method.
 */
const SHIPPING_METHODS: readonly ShippingMethod[] = ["standard", "express", "pickup"];

function parseShipping(value: unknown): ShippingMethod | null {
  return SHIPPING_METHODS.includes(value as ShippingMethod) ? (value as ShippingMethod) : null;
}

export type StartCheckoutResult =
  | { mode: "razorpay"; orderId: string; razorpayOrderId: string; amount: number; keyId: string; number: string }
  | { mode: "mock"; orderId: string; amount: number; number: string };

/** Creates a pending order from the cart and (if configured) a Razorpay order. */
export async function startCheckout(
  addressId: string,
  shipping: ShippingMethod,
): Promise<StartCheckoutResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const method = parseShipping(shipping);
  if (!method) throw new Error("Please choose a valid delivery method");

  const cart = await getCart();
  if (!cart || cart.items.length === 0) throw new Error("Your cart is empty");

  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw new Error("Please choose a valid delivery address");

  // Guard: in production we must NEVER fall through to the mock payment path
  // (which marks an order PAID with a fake id and collects no money). If the
  // Razorpay keys are missing in prod, fail loudly instead of shipping free orders.
  if (!isRazorpayConfigured && process.env.NODE_ENV === "production") {
    throw new Error("Online payments are temporarily unavailable. Please try again later.");
  }

  // SECURITY: quantity is validated in addToCart/updateCartItemQty, but this is
  // the money path — re-check here so a row poisoned by any other writer can't
  // subtract from the subtotal and dial the charged amount down.
  if (cart.items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1)) {
    throw new Error("Your cart contains an invalid quantity. Please review it and try again.");
  }

  const subtotal = cart.items.reduce((s, i) => s + i.product.priceInr * i.quantity, 0);
  const totals = computeTotals(subtotal, method);
  const number = await uniqueOrderNumber();

  const order = await prisma.order.create({
    data: {
      number,
      userId,
      addressId,
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotalInr: totals.subtotalInr,
      gstInr: totals.gstInr,
      shippingInr: totals.shippingInr,
      totalInr: totals.totalInr,
      items: {
        create: cart.items.map((i) => ({
          productId: i.productId,
          name: i.product.name,
          variantLabel: i.variantLabel || null,
          unitPriceInr: i.product.priceInr,
          quantity: i.quantity,
        })),
      },
    },
  });

  if (isRazorpayConfigured && razorpay) {
    const rzp = await razorpay.orders.create({
      amount: totals.totalInr * 100, // paise
      currency: "INR",
      receipt: order.number,
      notes: { orderId: order.id },
    });
    await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: rzp.id } });
    return {
      mode: "razorpay",
      orderId: order.id,
      razorpayOrderId: rzp.id,
      amount: totals.totalInr * 100,
      keyId: RAZORPAY_KEY_ID,
      number: order.number,
    };
  }

  return { mode: "mock", orderId: order.id, amount: totals.totalInr * 100, number: order.number };
}

async function finalizeOrder(orderId: string, paymentId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID", status: "PROCESSING", razorpayPaymentId: paymentId },
  });
  const cart = await getCart();
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  // Fire-and-forget: never block or fail checkout on email problems.
  // (sendOrderConfirmationEmail also never throws; double safety.)
  void sendOrderConfirmationEmail(orderId, { skipIfLogged: true }).catch((err) =>
    console.error("[checkout] order confirmation email failed:", err),
  );
  revalidatePath("/", "layout");
  revalidatePath("/cart");
}

export async function confirmRazorpayPayment(
  orderId: string,
  razorpayPaymentId: string,
  razorpayOrderId: string,
  signature: string,
): Promise<{ ok: true; orderId: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // 1) the signature must be valid for this razorpay order + payment
  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature)) {
    throw new Error("Payment verification failed");
  }
  // 2) the internal order must belong to this user AND map to exactly the
  //    razorpay order whose signature we just verified (prevents finalizing a
  //    different/victim order with a signature from a payment you control).
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, razorpayOrderId },
  });
  if (!order) throw new Error("Order not found");

  await finalizeOrder(order.id, razorpayPaymentId);
  return { ok: true, orderId: order.id };
}

/** Dev/test only — simulates a successful payment when Razorpay keys are absent. */
export async function confirmMockPayment(orderId: string): Promise<{ ok: true; orderId: string }> {
  // SECURITY: this marks an order PAID without collecting money, so it must be
  // impossible to reach in production. `isRazorpayConfigured` alone is a config
  // check, not a boundary — if the Razorpay env vars were ever dropped or
  // mis-rotated in prod, this Server Action (a public POST endpoint) would let a
  // signed-in customer settle their own PENDING orders for free.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Payment could not be completed. Please try again.");
  }
  if (isRazorpayConfigured) throw new Error("Mock payment is disabled when Razorpay is configured");
  const session = await auth();
  // SECURITY: must be a concrete id — Prisma drops a `where` key whose value is
  // `undefined`, so an unauthenticated caller would otherwise match ANY user's
  // pending order and mark it paid.
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, paymentStatus: "PENDING" },
  });
  if (!order) throw new Error("Order not found");
  await finalizeOrder(orderId, `mock_${orderId.slice(0, 10)}`);
  return { ok: true, orderId };
}
