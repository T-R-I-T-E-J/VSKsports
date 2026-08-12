import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { prisma } from "@/lib/db";
import { settleOrderPaid, markOrderFailed } from "@/lib/orders";

// HMAC verification and Prisma both need Node built-ins — never the edge runtime.
export const runtime = "nodejs";

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; error_description?: string } };
    order?: { entity?: { id?: string } };
  };
};

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

  const razorpayOrderId =
    event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id;
  if (!razorpayOrderId) return NextResponse.json({ ok: true });

  // razorpayOrderId is @unique, so this is an indexed single-row lookup.
  const order = await prisma.order.findUnique({
    where: { razorpayOrderId },
    select: { id: true },
  });
  if (!order) return NextResponse.json({ ok: true });

  if (event.event === "payment.captured" || event.event === "order.paid") {
    await settleOrderPaid(order.id, event.payload?.payment?.entity?.id ?? null);
  } else if (event.event === "payment.failed") {
    await markOrderFailed(
      order.id,
      event.payload?.payment?.entity?.error_description ?? "Payment failed at gateway",
    );
  }

  return NextResponse.json({ ok: true });
}
