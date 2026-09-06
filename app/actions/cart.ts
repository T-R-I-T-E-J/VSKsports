"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateCart } from "@/lib/cart";

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
