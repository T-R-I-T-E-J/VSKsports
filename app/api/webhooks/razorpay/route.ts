import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { prisma } from "@/lib/db";

// Razorpay webhook — the server-side source of truth for payment status.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      order?: { entity?: { id?: string } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const razorpayOrderId =
      event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id;
    const paymentId = event.payload?.payment?.entity?.id ?? null;
    if (razorpayOrderId) {
      // idempotent: only mark unpaid orders
      await prisma.order.updateMany({
        where: { razorpayOrderId, paymentStatus: { not: "PAID" } },
        data: { paymentStatus: "PAID", status: "PROCESSING", razorpayPaymentId: paymentId },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
