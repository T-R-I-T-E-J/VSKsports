"use server";

// Dealer portal — bulk order server action.
// Items are priced at Product.dealerPriceInr; the order is created PENDING
// (paid on account / against credit) with a VSK-B2B-XXXXXX number after a
// credit-limit check against the dealer's open orders.

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeTotals } from "@/lib/pricing";
import { formatINR } from "@/lib/format";
import { sendOrderConfirmationEmail } from "@/lib/email/mailer";

export type BulkLine = { productId: string; quantity: number };

export type BulkOrderResult =
  | { ok: true; orderId: string; number: string; totalInr: number }
  | { ok: false; error: string };

async function uniqueB2BNumber(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const n = `VSK-B2B-${Math.floor(100000 + Math.random() * 900000)}`;
    const exists = await prisma.order.findUnique({ where: { number: n } });
    if (!exists) return n;
  }
  return `VSK-B2B-${Date.now()}`;
}

export async function placeBulkOrder(lines: BulkLine[]): Promise<BulkOrderResult> {
  // Role verified server-side in the action itself (middleware is not enough).
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || (role !== "DEALER" && role !== "ADMIN" && role !== "STAFF")) {
    return { ok: false, error: "Dealer access required." };
  }

  const clean = (lines ?? [])
    .map((l) => ({ productId: String(l.productId), quantity: Math.floor(Number(l.quantity)) }))
    .filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0);
  if (clean.length === 0) return { ok: false, error: "Add a quantity for at least one product." };

  const products = await prisma.product.findMany({
    where: { id: { in: clean.map((l) => l.productId) }, isActive: true, dealerPriceInr: { not: null } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const l of clean) {
    if (!byId.has(l.productId)) {
      return { ok: false, error: "One of the selected products is not available at dealer pricing." };
    }
  }

  // Wholesale pricing: dealerPriceInr per unit; GST 18% via computeTotals.
  const subtotal = clean.reduce(
    (s, l) => s + (byId.get(l.productId)!.dealerPriceInr as number) * l.quantity,
    0,
  );
  const totals = computeTotals(subtotal, "standard");

  // Credit-limit check: open (PENDING/PROCESSING) order total + this order.
  const profile = await prisma.dealerProfile.findUnique({ where: { userId } });
  if (profile?.creditLimitInr != null) {
    const agg = await prisma.order.aggregate({
      where: { userId, status: { in: ["PENDING", "PROCESSING"] } },
      _sum: { totalInr: true },
    });
    const creditUsed = agg._sum.totalInr ?? 0;
    if (creditUsed + totals.totalInr > profile.creditLimitInr) {
      const available = Math.max(0, profile.creditLimitInr - creditUsed);
      return {
        ok: false,
        error: `Credit limit exceeded — this order (${formatINR(totals.totalInr)}) is more than your available credit of ${formatINR(available)} (limit ${formatINR(profile.creditLimitInr)}).`,
      };
    }
  }

  const number = await uniqueB2BNumber();
  const order = await prisma.order.create({
    data: {
      number,
      userId,
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotalInr: totals.subtotalInr,
      gstInr: totals.gstInr,
      shippingInr: totals.shippingInr,
      totalInr: totals.totalInr,
      items: {
        create: clean.map((l) => {
          const pdt = byId.get(l.productId)!;
          return {
            productId: pdt.id,
            name: pdt.name,
            unitPriceInr: pdt.dealerPriceInr as number,
            quantity: l.quantity,
          };
        }),
      },
    },
  });

  // Dealer orders skip Razorpay — send the order confirmation directly.
  // sendOrderConfirmationEmail never throws; an email problem can't fail the order.
  await sendOrderConfirmationEmail(order.id, { skipIfLogged: true });

  revalidatePath("/dealer");
  revalidatePath("/dealer/invoices");
  return { ok: true, orderId: order.id, number: order.number, totalInr: order.totalInr };
}
