import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature, razorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/db";
import { settleOrderPaid, markOrderFailed } from "@/lib/orders";
import { alertOps } from "@/lib/alerts";

// HMAC verification and Prisma both need Node built-ins — never the edge runtime.
export const runtime = "nodejs";

type Notes = { orderId?: string };

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number; // paise
        error_description?: string;
        // NOTE: `notes` is deliberately absent from this type. Razorpay Checkout
        // lets the BROWSER supply notes on a payment, so anything in here is
        // attacker-controlled and must never be used to identify an order.
        // Only the gateway ORDER's notes (below) are set by us and trustworthy.
      };
    };
    order?: { entity?: { id?: string; notes?: Notes } };
  };
};

/** Events that must map to one of our orders. Anything else is not ours to act on. */
const HANDLED = new Set(["payment.captured", "order.paid", "payment.failed"]);

/**
 * Map a Razorpay order id back to our Order.
 *
 * `Order.razorpayOrderId` holds only the MOST RECENT attempt, but `retryPayment`
 * opens a fresh gateway order each time while the earlier ones stay payable —
 * an async method (UPI collect, netbanking) approved after a retry captures
 * against an id this column no longer holds. Falling back to the internal id we
 * stamp into Razorpay's `notes` at checkout keeps every attempt resolvable,
 * because that value is identical across all of them.
 */
type Resolution =
  | { kind: "found"; order: { id: string; totalInr: number } }
  /** Resolution completed and this gateway order is definitively not ours. */
  | { kind: "not-ours" }
  /** Could not determine — treat as transient and let Razorpay redeliver. */
  | { kind: "unknown" };

const ORDER_FIELDS = { id: true, totalInr: true } as const;

async function resolveOrder(
  razorpayOrderId: string,
  event: RazorpayEvent,
): Promise<Resolution> {
  // Fast path — the current attempt. `razorpayOrderId` is @unique, so this is
  // an indexed single-row lookup.
  const direct = await prisma.order.findUnique({
    where: { razorpayOrderId },
    select: ORDER_FIELDS,
  });
  if (direct) return { kind: "found", order: direct };

  // Notes on the gateway ORDER, which only `openGatewayOrder` writes. Present
  // on `order.paid`, and reading it here saves an API round-trip.
  const noted = event.payload?.order?.entity?.notes?.orderId;
  if (noted) {
    const byNote = await prisma.order.findUnique({ where: { id: noted }, select: ORDER_FIELDS });
    if (byNote) return { kind: "found", order: byNote };
  }

  // `payment.captured` ships only the payment entity, so ask Razorpay for the
  // gateway order and read the notes WE set on it. This is the authoritative
  // source — never the payment's own notes, which the browser can set.
  if (!razorpay) return { kind: "unknown" };
  try {
    const remote = await razorpay.orders.fetch(razorpayOrderId);
    const id = (remote?.notes as Notes | undefined)?.orderId;
    if (!id) return { kind: "not-ours" }; // a gateway order we never created
    const byRemote = await prisma.order.findUnique({ where: { id }, select: ORDER_FIELDS });
    return byRemote ? { kind: "found", order: byRemote } : { kind: "not-ours" };
  } catch (err) {
    console.error("[razorpay] orders.fetch(%s) failed:", razorpayOrderId, err);
    return { kind: "unknown" };
  }
}

// Razorpay webhook — the server-side source of truth for payment status.
// It settles through the same `settleOrderPaid` / `markOrderFailed` helpers the
// browser uses, so stock movement, order events and cart clearing are identical
// whichever path wins the race (and run exactly once across both).
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Events we don't act on (refunds, settlements, subscription traffic) are
  // acknowledged and dropped. Only past this point does an unresolvable order
  // mean something is wrong.
  if (!event.event || !HANDLED.has(event.event)) {
    return NextResponse.json({ ok: true, ignored: event.event ?? null });
  }

  const razorpayOrderId =
    event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id;
  if (!razorpayOrderId) {
    console.error("[razorpay] %s carried no gateway order id", event.event);
    return NextResponse.json({ ok: true });
  }

  const resolved = await resolveOrder(razorpayOrderId, event);

  if (resolved.kind === "not-ours") {
    // We asked Razorpay and the gateway order carries no internal id, so it was
    // never created by this app (payment link, dashboard payment, shared key).
    // Retrying can never resolve it — acknowledge instead of looping for 24h.
    console.warn("[razorpay] ignoring %s for foreign order %s", event.event, razorpayOrderId);
    return NextResponse.json({ ok: true, ignored: "foreign order" });
  }

  if (resolved.kind === "unknown") {
    // We could not determine whether this is ours (gateway or DB unreachable).
    // Money may have moved with no matching record, so fail loudly and let
    // Razorpay redeliver rather than dropping the event silently.
    console.error("[razorpay] unresolvable order for %s (%s)", razorpayOrderId, event.event);
    alertOps("payment.unresolvable_order", { razorpayOrderId, event: event.event });
    return NextResponse.json({ ok: false, error: "unresolved" }, { status: 500 });
  }

  const order = resolved.order;

  // A throw below rolls the settlement back, so answering non-2xx is correct:
  // Razorpay redelivers and the retry re-runs it. Log it rather than letting the
  // framework return a stack trace to the gateway.
  try {
    if (event.event === "payment.captured" || event.event === "order.paid") {
      // Defence in depth: never settle an order for less than it is worth, even
      // if resolution somehow pointed at the wrong row.
      const paid = event.payload?.payment?.entity?.amount;
      const expected = order.totalInr * 100; // paise
      if (typeof paid === "number" && paid < expected) {
        console.error(
          "[razorpay] REFUSING to settle order %s: captured %d paise, expected %d",
          order.id,
          paid,
          expected,
        );
        // Money has been captured at the gateway and the order stays PENDING.
        // Answering 200 stops Razorpay retrying, so without an alert this is a
        // paying customer with nothing to show for it and nobody informed.
        alertOps("payment.amount_mismatch", {
          orderId: order.id,
          capturedPaise: paid,
          expectedPaise: expected,
          razorpayOrderId,
        });
        return NextResponse.json({ ok: false, error: "amount mismatch" }, { status: 200 });
      }

      const settled = await settleOrderPaid(order.id, event.payload?.payment?.entity?.id ?? null);
      if (!settled) {
        // Already PAID (or refunded). Usually the browser simply won the race —
        // but it also fires when a customer paid a superseded gateway order AND
        // the retry, i.e. was charged twice. Log it so that is discoverable.
        console.warn(
          "[razorpay] %s for already-settled order %s (gateway order %s, payment %s)",
          event.event,
          order.id,
          razorpayOrderId,
          event.payload?.payment?.entity?.id ?? "n/a",
        );
        // Usually the browser simply won the race, but this is also the only
        // signal that a customer paid a superseded gateway order AND the retry,
        // i.e. was charged twice. Needs a human to compare and refund.
        alertOps("payment.possible_double_charge", {
          orderId: order.id,
          event: event.event,
          razorpayOrderId,
          paymentId: event.payload?.payment?.entity?.id ?? null,
        });
      }
    } else if (event.event === "payment.failed") {
      await markOrderFailed(
        order.id,
        event.payload?.payment?.entity?.error_description ?? "Payment failed at gateway",
      );
    }
  } catch (err) {
    console.error("[razorpay] %s failed for order %s:", event.event, order.id, err);
    alertOps("payment.settlement_failed", {
      orderId: order.id,
      event: event.event,
      reason: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, error: "settlement failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
