import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email/mailer";

/**
 * Settle an order as PAID — exactly once.
 *
 * Two independent callers race to settle every order: the browser's
 * `confirmRazorpayPayment` (fast, but the tab can be closed) and the Razorpay
 * webhook (authoritative, but may arrive first or twice). Everything here is
 * side-effecting and must NOT run twice, so the status write itself is the
 * lock: `updateMany` with `paymentStatus: { not: "PAID" }` is a single atomic
 * statement, and only the caller whose update actually matched a row
 * (`count === 1`) goes on to move stock.
 *
 * Returns true when THIS call was the one that settled the order.
 */
export async function settleOrderPaid(
  orderId: string,
  paymentId: string | null,
): Promise<boolean> {
  const settled = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: "PAID" } },
    data: {
      paymentStatus: "PAID",
      status: "PROCESSING",
      razorpayPaymentId: paymentId,
      failureReason: null, // a retry that succeeds clears the earlier failure
    },
  });
  if (settled.count === 0) return false; // already settled by the other path

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      items: { select: { productId: true, variantLabel: true, quantity: true } },
    },
  });
  if (!order) return false;

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (!item.productId) continue; // deleted product — nothing to decrement
      await tx.inventoryItem.updateMany({
        where: { productId: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
      if (item.variantLabel) {
        await tx.productVariant.updateMany({
          where: { productId: item.productId, label: item.variantLabel },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    await tx.orderEvent.create({
      data: { orderId, status: "PROCESSING", note: "Payment received" },
    });

    // Clear the cart. The webhook has no cookie, so this goes through the
    // user binding that `startCheckout` writes rather than the cart token.
    if (order.userId) {
      await tx.cartItem.deleteMany({ where: { cart: { userId: order.userId } } });
    }
  });

  // Fire-and-forget: never block or fail settlement on email problems.
  // (sendOrderConfirmationEmail is itself idempotent via EmailLog.)
  void sendOrderConfirmationEmail(orderId, { skipIfLogged: true }).catch((err) =>
    console.error("[orders] order confirmation email failed:", err),
  );

  revalidatePath("/", "layout");
  revalidatePath("/cart");
  return true;
}

/**
 * Record a failed payment attempt. Guarded by `paymentStatus: { not: "PAID" }`
 * so a late `payment.failed` webhook can never downgrade a captured payment —
 * Razorpay can emit a failure for an earlier attempt on an order that has since
 * been paid on retry.
 */
export async function markOrderFailed(orderId: string, reason: string): Promise<boolean> {
  const res = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: "PAID" } },
    data: { paymentStatus: "FAILED", failureReason: reason.slice(0, 300) },
  });
  if (res.count === 0) return false;

  await prisma.orderEvent.create({
    data: { orderId, status: "PENDING", note: `Payment failed: ${reason}`.slice(0, 300) },
  });
  return true;
}
