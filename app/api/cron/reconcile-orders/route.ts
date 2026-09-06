import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { razorpay, isRazorpayConfigured } from "@/lib/razorpay";
import { settleOrderPaid, markOrderFailed, SETTLEABLE_FROM } from "@/lib/orders";
import { alertOps } from "@/lib/alerts";

export const runtime = "nodejs";

/**
 * Reconcile orders that are still awaiting payment against the gateway.
 *
 * The webhook is the only thing that settles an asynchronous payment (UPI
 * collect, netbanking) once the customer's tab is gone. If a delivery fails —
 * endpoint down, secret rotated, signature rejected — the money is captured at
 * Razorpay and the order sits PENDING forever, with nothing to connect the two.
 * The customer then contacts support with a payment reference that matches no
 * fulfilled order.
 *
 * This closes that hole by asking Razorpay directly. It settles through the same
 * `settleOrderPaid` / `markOrderFailed` helpers as every other path, which are
 * idempotent, so re-running it is safe and a webhook that arrives later is a
 * no-op.
 */

/** Give a customer time to finish paying before treating an order as stranded. */
const MIN_AGE_MS = 30 * 60 * 1000;
/** Don't chase orders forever — beyond this the gateway order has long expired. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Bound the work per run so a backlog cannot exceed the function timeout. */
const BATCH = 50;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Fail CLOSED, matching the cleanup job: without a secret this would let
  // anyone trigger gateway calls and settlement writes.
  if (!secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isRazorpayConfigured || !razorpay) {
    // Nothing to reconcile against. Surfaced as 503 so a monitor notices that
    // this safety net is not actually running.
    return NextResponse.json({ error: "Payments not configured." }, { status: 503 });
  }

  const now = Date.now();
  const stranded = await prisma.order.findMany({
    where: {
      paymentStatus: { in: [...SETTLEABLE_FROM] },
      razorpayOrderId: { not: null },
      createdAt: { lt: new Date(now - MIN_AGE_MS), gt: new Date(now - MAX_AGE_MS) },
    },
    select: { id: true, razorpayOrderId: true, totalInr: true },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  let settled = 0;
  let failed = 0;
  let untouched = 0;

  for (const order of stranded) {
    try {
      // All payments against this gateway order, whatever their state.
      const res = await razorpay.orders.fetchPayments(order.razorpayOrderId!);
      const payments = (res?.items ?? []) as { id?: string; status?: string; amount?: number }[];

      // Same defence the webhook applies: never settle for less than the order
      // is worth, even if the gateway reports a capture.
      const captured = payments.find(
        (p) => p.status === "captured" && (p.amount ?? 0) >= order.totalInr * 100,
      );

      if (captured) {
        const didSettle = await settleOrderPaid(order.id, captured.id ?? null);
        if (didSettle) {
          settled++;
          alertOps("order.reconciled", {
            orderId: order.id,
            razorpayOrderId: order.razorpayOrderId,
            paymentId: captured.id ?? null,
          });
        } else {
          untouched++;
        }
        continue;
      }

      // Every attempt failed and the order is old enough to give up on.
      if (payments.length > 0 && payments.every((p) => p.status === "failed")) {
        await markOrderFailed(order.id, "Payment failed at gateway (reconciled)");
        failed++;
        continue;
      }

      untouched++;
    } catch (err) {
      // One bad order must not abort the batch.
      console.error("[reconcile] order %s failed:", order.id, err);
      alertOps("order.reconcile_failed", {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    examined: stranded.length,
    settled,
    failed,
    untouched,
  });
}
