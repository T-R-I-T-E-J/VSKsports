"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCart } from "@/lib/cart";
import { computeTotals, type ShippingMethod } from "@/lib/pricing";
import { settleOrderPaid, markOrderFailed } from "@/lib/orders";
import {
  razorpay,
  isRazorpayConfigured,
  verifyPaymentSignature,
  RAZORPAY_KEY_ID,
} from "@/lib/razorpay";

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

const PAYMENTS_UNCONFIGURED =
  "Online payments are not configured. Please contact support.";

export type StartCheckoutResult = {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  keyId: string;
  number: string;
};

/** Creates a pending order from the cart, plus the matching Razorpay order. */
export async function startCheckout(
  addressId: string,
  shipping: ShippingMethod,
): Promise<StartCheckoutResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const method = parseShipping(shipping);
  if (!method) throw new Error("Please choose a valid delivery method");

  // Razorpay is the ONLY payment path — there is no mock/simulated settlement
  // to fall through to. Check before writing anything so a missing key can
  // never leave an orphaned PENDING order behind.
  if (!isRazorpayConfigured || !razorpay) throw new Error(PAYMENTS_UNCONFIGURED);

  const cart = await getCart();
  if (!cart || cart.items.length === 0) throw new Error("Your cart is empty");

  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw new Error("Please choose a valid delivery address");

  // SECURITY: quantity is validated in addToCart/updateCartItemQty, but this is
  // the money path — re-check here so a row poisoned by any other writer can't
  // subtract from the subtotal and dial the charged amount down.
  if (cart.items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1)) {
    throw new Error("Your cart contains an invalid quantity. Please review it and try again.");
  }

  // Don't take money for stock we don't have.
  const inventory = await prisma.inventoryItem.findMany({
    where: { productId: { in: cart.items.map((i) => i.productId) } },
    select: { productId: true, stock: true },
  });
  const stockByProduct = new Map(inventory.map((i) => [i.productId, i.stock]));
  const short = cart.items.find((i) => (stockByProduct.get(i.productId) ?? 0) < i.quantity);
  if (short) {
    throw new Error(`"${short.product.name}" is out of stock. Please update your cart.`);
  }

  const subtotal = cart.items.reduce((s, i) => s + i.product.priceInr * i.quantity, 0);
  const totals = computeTotals(subtotal, method);
  const number = await uniqueOrderNumber();

  // Bind the cookie cart to the user so the webhook — which has no cookie —
  // can still clear it after settling. Cart.userId is @unique, so release any
  // older cart this user owns first.
  if (cart.userId !== userId) {
    await prisma.cart.updateMany({
      where: { userId, id: { not: cart.id } },
      data: { userId: null },
    });
    await prisma.cart.update({ where: { id: cart.id }, data: { userId } });
  }

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

  return openGatewayOrder(order.id, order.number, totals.totalInr);
}

/** Creates the Razorpay order for an existing internal order and stores its id. */
async function openGatewayOrder(
  orderId: string,
  number: string,
  totalInr: number,
): Promise<StartCheckoutResult> {
  if (!razorpay) throw new Error(PAYMENTS_UNCONFIGURED);
  const amount = totalInr * 100; // paise
  const rzp = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: number,
    notes: { orderId },
  });
  await prisma.order.update({ where: { id: orderId }, data: { razorpayOrderId: rzp.id } });
  return { orderId, razorpayOrderId: rzp.id, amount, keyId: RAZORPAY_KEY_ID, number };
}

/**
 * Re-open payment on an order that already exists (failed card, dismissed
 * modal). Charges the totals STORED on the order — never recomputed from the
 * cart, which may have changed since — and reuses the same order row so a
 * customer retrying three times doesn't leave three orphans behind.
 */
export async function retryPayment(orderId: string): Promise<StartCheckoutResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  if (!isRazorpayConfigured || !razorpay) throw new Error(PAYMENTS_UNCONFIGURED);

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, paymentStatus: { not: "PAID" } },
    select: { id: true, number: true, totalInr: true },
  });
  if (!order) throw new Error("Order not found");

  return openGatewayOrder(order.id, order.number, order.totalInr);
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

  await settleOrderPaid(order.id, razorpayPaymentId);
  return { ok: true, orderId: order.id };
}

/** Records a failed attempt so the order isn't left looking merely pending. */
export async function markPaymentFailed(
  orderId: string,
  reason: string,
): Promise<{ ok: true }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new Error("Order not found");

  await markOrderFailed(order.id, reason || "Payment failed");
  return { ok: true };
}
