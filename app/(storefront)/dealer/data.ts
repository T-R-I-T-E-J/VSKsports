// Dealer portal — shared server-side data helpers.
// Every query is scoped to the logged-in dealer's userId; role is verified
// server-side here (middleware gates /dealer too, defence in depth).

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type DealerSession = { userId: string; role: string };

/** Page guard: redirects unless the session is a DEALER (or staff). */
export async function requireDealerPage(): Promise<DealerSession> {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId) redirect("/login");
  if (role !== "DEALER" && role !== "ADMIN" && role !== "STAFF") redirect("/");
  return { userId, role: role as string };
}

/** Credit used = total of this dealer's open (PENDING/PROCESSING) orders. */
export async function getCreditUsed(userId: string): Promise<number> {
  const agg = await prisma.order.aggregate({
    where: { userId, status: { in: ["PENDING", "PROCESSING"] } },
    _sum: { totalInr: true },
  });
  return agg._sum.totalInr ?? 0;
}

export async function getDealerProfile(userId: string) {
  return prisma.dealerProfile.findUnique({ where: { userId } });
}

/** Wholesale catalog: active products carrying a dealer price. */
export async function getWholesaleProducts() {
  return prisma.product.findMany({
    where: { isActive: true, dealerPriceInr: { not: null } },
    include: { brand: true },
    orderBy: { priceInr: "desc" },
  });
}

/** This dealer's most-ordered products (by total quantity), for reorder. */
export async function getReorderSuggestions(userId: string, take = 3) {
  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { userId }, productId: { not: null } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take,
  });
  const ids = grouped.map((g) => g.productId).filter((id): id is string => !!id);
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, dealerPriceInr: { not: null } },
    include: { brand: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return grouped
    .map((g) => {
      const product = g.productId ? byId.get(g.productId) : undefined;
      return product ? { product, totalQty: g._sum.quantity ?? 0 } : null;
    })
    .filter((x): x is { product: (typeof products)[number]; totalQty: number } => !!x);
}
