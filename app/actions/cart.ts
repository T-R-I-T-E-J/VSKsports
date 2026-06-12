"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateCart } from "@/lib/cart";

export async function addToCart(
  productId: string,
  quantity = 1,
  variantLabel?: string | null,
) {
  const cart = await getOrCreateCart();
  const v = variantLabel ?? "";
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantLabel: v },
  });
  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantLabel: v, quantity },
    });
  }
  revalidatePath("/cart");
}

export async function updateCartItemQty(itemId: string, quantity: number) {
  if (quantity < 1) return removeCartItem(itemId);
  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  revalidatePath("/cart");
}

export async function removeCartItem(itemId: string) {
  await prisma.cartItem.delete({ where: { id: itemId } }).catch(() => {});
  revalidatePath("/cart");
}
