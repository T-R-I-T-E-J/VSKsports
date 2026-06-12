import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

export const CART_COOKIE = "vsk_cart";

/** Read-only — safe in server components. Returns null if no cart cookie yet. */
export async function getCart() {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  return prisma.cart.findUnique({
    where: { token },
    include: { items: { include: { product: { include: { brand: true } } } } },
  });
}

export async function getCartCount(): Promise<number> {
  const cart = await getCart();
  return cart ? cart.items.reduce((n, i) => n + i.quantity, 0) : 0;
}

/** Sets the cart cookie — only call from a Server Action or Route Handler. */
export async function getOrCreateCart() {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (token) {
    const existing = await prisma.cart.findUnique({ where: { token } });
    if (existing) return existing;
  }
  const newToken = randomUUID();
  jar.set(CART_COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  return prisma.cart.create({ data: { token: newToken } });
}
