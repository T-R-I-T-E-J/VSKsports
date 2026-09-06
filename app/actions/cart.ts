"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateCart } from "@/lib/cart";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkCoupon, normaliseCode } from "@/lib/coupons";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Max units of a single product+variant per cart line. */
const MAX_QTY = 99;

/**
 * SECURITY: these are Server Actions — directly invocable POST endpoints, so
 * every argument is attacker-controlled and the TypeScript types are erased at
 * runtime. A negative quantity reaches checkout's subtotal reduce and lets an
 * attacker dial the Razorpay charge down to an arbitrary amount, so quantity
 * must be validated here. Returns null when the input isn't a usable quantity.
 */
function validQty(quantity: unknown): number | null {
  return Number.isInteger(quantity) && (quantity as number) >= 1
    ? (quantity as number)
    : null;
}

export async function addToCart(
  productId: string,
  quantity = 1,
  variantLabel?: string | null,
) {
  const qty = validQty(quantity);
  if (qty === null) return;

  // SECURITY: `toggleProductActive` is the only way staff withdraw a product
  // from sale — there is no delete — so isActive is the withdrawal switch. It
  // was never checked here, which meant a product pulled for a recall, a
  // supplier dispute or a compliance reason could still be added and bought by
  // calling this action with its id. The dealer bulk-order path already filters
  // on isActive; this brings the retail path in line.
  const sellable = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true },
  });
  if (!sellable) return;

  const cart = await getOrCreateCart();
  const v = variantLabel ?? "";
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantLabel: v },
  });
  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      // Clamped so repeated adds can't overflow past the per-line cap.
      data: { quantity: Math.min(MAX_QTY, existing.quantity + qty) },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantLabel: v, quantity: Math.min(MAX_QTY, qty) },
    });
  }
  revalidatePath("/cart");
}

export async function updateCartItemQty(itemId: string, quantity: number) {
  if (!Number.isInteger(quantity)) return;
  if (quantity < 1) return removeCartItem(itemId);

  // Scope to the caller's own cart — `itemId` alone would let anyone edit any
  // cart item. updateMany is a no-op when the item isn't ours.
  const cart = await getOrCreateCart();
  await prisma.cartItem.updateMany({
    where: { id: itemId, cartId: cart.id },
    data: { quantity: Math.min(MAX_QTY, quantity) },
  });
  revalidatePath("/cart");
}

export async function removeCartItem(itemId: string) {
  // Same ownership scoping as above; deleteMany is a no-op when not ours.
  const cart = await getOrCreateCart();
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  revalidatePath("/cart");
}

/**
 * Apply a promo code to the cart.
 *
 * Stores the CODE, not a resolved discount: the coupon is re-validated and the
 * discount recomputed at checkout, so a code that expires or runs out while the
 * cart sits open cannot be honoured on a stale figure.
 *
 * Rate-limited because this endpoint is an oracle — without a limit, an
 * attacker could enumerate valid codes by brute force.
 */
export async function applyCoupon(code: string) {
  const raw = typeof code === "string" ? code : "";
  const normalised = normaliseCode(raw);
  if (!normalised || normalised.length > 64) {
    redirect("/cart?coupon=invalid");
  }

  const cart = await getOrCreateCart();
  const ip = await clientIp();
  const limited = await rateLimit(`coupon:${ip}`, 10, 10 * 60 * 1000);
  if (!limited.ok) {
    redirect(`/cart?coupon=throttled&retry=${limited.retryAfterSec}`);
  }

  const full = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: { items: { include: { product: true } } },
  });
  const subtotal =
    full?.items.reduce((s, i) => s + i.product.priceInr * i.quantity, 0) ?? 0;

  const session = await auth();
  const result = await checkCoupon(normalised, subtotal, session?.user?.id ?? null);
  if (!result.ok) {
    redirect(`/cart?coupon=rejected&reason=${result.reason}`);
  }

  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: result.code } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  redirect("/cart?coupon=applied");
}

export async function removeCoupon() {
  const cart = await getOrCreateCart();
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  redirect("/cart");
}
