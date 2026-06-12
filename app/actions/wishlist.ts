"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addToCart } from "./cart";

export async function toggleWishlist(
  productId: string,
): Promise<{ status: "added" | "removed" | "unauthorized" }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { status: "unauthorized" };

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/wishlist");
    return { status: "removed" };
  }
  await prisma.wishlistItem.create({ data: { userId, productId } });
  revalidatePath("/wishlist");
  return { status: "added" };
}

/** Move a wishlisted product into the cart and remove it from the wishlist. */
export async function moveWishlistItemToCart(productId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  await addToCart(productId, 1, null);
  await prisma.wishlistItem
    .delete({ where: { userId_productId: { userId, productId } } })
    .catch(() => {});
  revalidatePath("/wishlist");
}

/** Move every wishlisted product into the cart and clear the wishlist. */
export async function moveAllWishlistToCart() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  const items = await prisma.wishlistItem.findMany({ where: { userId } });
  for (const it of items) {
    await addToCart(it.productId, 1, null);
  }
  await prisma.wishlistItem.deleteMany({ where: { userId } });
  revalidatePath("/wishlist");
  revalidatePath("/cart");
}
