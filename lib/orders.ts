import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email/mailer";
import { alertOps } from "@/lib/alerts";

/**
 * The statuses a payment may still move OUT of.
 *
 * Deliberately NOT `{ not: "PAID" }`: `PaymentStatus` also contains REFUNDED,
 * so `not: "PAID"` matches refunded orders. A replayed `payment.captured` —
 * Razorpay's own retry queue, or an operator re-firing the event from the
 * dashboard — would flip a refunded order back to PAID, decrement stock a
 * second time and re-count it in revenue. Naming the two statuses we accept
 * keeps a new enum member from silently widening the guard again.
 */
export const SETTLEABLE_FROM = ["PENDING", "FAILED"] as const;

/**
 * The stock loop issues up to two statements per line item, so a large order can
 * outrun Prisma's 5s default. A settlement that times out rolls back cleanly and
 * is re-driven by the webhook retry, but it is cheaper to finish the first time.
 */
const SETTLE_TX = { timeout: 20_000, maxWait: 10_000 };

/**
 * Settle an order as PAID — exactly once.
 *
 * Two independent callers race to settle every order: the browser's
 * `confirmRazorpayPayment` (fast, but the tab can be closed) and the Razorpay
 * webhook (authoritative, but may arrive first or twice). Everything here is
 * side-effecting and must NOT run twice, so the status write itself is the
 * lock: `updateMany` filtered on `SETTLEABLE_FROM` is a single atomic
 * statement, and only the caller whose update actually matched a row
 * (`count === 1`) goes on to move stock.
 *
 * The lock and the side effects share ONE transaction, which is what makes the
 * guarantee exactly-once rather than at-most-once. Held apart, a failure after
 * the status write would leave the order PAID with stock never decremented and
 * the cart never cleared — and the webhook retry would then match zero rows and
 * decline to repair it, permanently. Rolling back releases the lock, so the
 * retry genuinely re-settles.
 *
 * Returns true when THIS call was the one that settled the order.
 */
export async function settleOrderPaid(
  orderId: string,
  paymentId: string | null,
): Promise<boolean> {
  const settled = await prisma.$transaction(async (tx) => {
    const lock = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: { in: [...SETTLEABLE_FROM] } },
      data: {
        paymentStatus: "PAID",
        status: "PROCESSING",
        razorpayPaymentId: paymentId,
        failureReason: null, // a retry that succeeds clears the earlier failure
      },
    });
    if (lock.count === 0) return false; // already settled, or refunded — not ours

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        // Ordered by productId so concurrent settlements take row locks in the
        // same sequence — otherwise two orders sharing products can deadlock.
        items: {
          select: { productId: true, variantLabel: true, quantity: true, name: true },
          orderBy: { productId: "asc" },
        },
      },
    });
    // We just updated this row, so it cannot be missing. Throw rather than
    // return: that rolls the status write back instead of leaving the order
    // PAID with none of the side effects applied.
    if (!order) throw new Error(`settleOrderPaid: order ${orderId} vanished mid-transaction`);

    // Stock movements that could not be made in full. The payment is already
    // captured by the time we get here, so refusing to settle would strand a
    // paid order — record the shortfall instead and let fulfilment resolve it.
    const shortfalls: string[] = [];

    for (const item of order.items) {
      if (!item.productId) continue; // deleted product — nothing to decrement

      // `stock: { gte }` makes the decrement conditional: matching zero rows
      // means there was not enough (or no inventory row at all) rather than
      // silently driving stock negative, which the bare decrement used to do.
      const moved = await tx.inventoryItem.updateMany({
        where: { productId: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (moved.count === 0) {
        shortfalls.push(`${item.name} x${item.quantity}`);
        // Take whatever remains rather than leaving it to be sold again.
        await tx.inventoryItem.updateMany({
          where: { productId: item.productId },
          data: { stock: 0 },
        });
      }

      if (item.variantLabel) {
        const movedVariant = await tx.productVariant.updateMany({
          where: {
            productId: item.productId,
            label: item.variantLabel,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });
        if (movedVariant.count === 0) {
          shortfalls.push(`${item.name} (${item.variantLabel}) x${item.quantity}`);
          await tx.productVariant.updateMany({
            where: { productId: item.productId, label: item.variantLabel },
            data: { stock: 0 },
          });
        }
      }
    }

    await tx.orderEvent.create({
      data: {
        orderId,
        status: "PROCESSING",
        note: shortfalls.length
          ? `Payment received — STOCK SHORTFALL, needs manual fulfilment: ${shortfalls.join("; ")}`.slice(
              0,
              300,
            )
          : "Payment received",
      },
    });

    if (shortfalls.length) {
      console.error("[orders] oversold on order %s: %s", orderId, shortfalls.join("; "));
      // The payment is already captured and the order needs manual fulfilment,
      // so this must reach a human rather than sit in a log nobody reads.
      alertOps("order.oversold", { orderId, shortfalls });
    }

    // Clear the cart. The webhook has no cookie, so this goes through the
    // user binding that `startCheckout` writes rather than the cart token.
    if (order.userId) {
      await tx.cartItem.deleteMany({ where: { cart: { userId: order.userId } } });
    }

    return true;
  }, SETTLE_TX);

  if (!settled) return false;

  // Everything below is outside the transaction on purpose: it is not
  // rollback-able, and must not run until the settlement is durably committed.

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
 * Record a failed payment attempt.
 *
 * Guarded on `SETTLEABLE_FROM` so a late `payment.failed` can never downgrade
 * an order that is already settled — Razorpay emits a failure for an earlier
 * attempt on an order that has since been paid on retry, and (the reason
 * `not: "PAID"` was wrong here too) can emit one against an order that was paid
 * and subsequently refunded. FAILED is included so a second failed attempt is
 * still recorded; the status write and its audit event share one transaction so
 * an order can never be left FAILED with no event explaining why.
 */
export async function markOrderFailed(orderId: string, reason: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: { in: [...SETTLEABLE_FROM] } },
      data: { paymentStatus: "FAILED", failureReason: reason.slice(0, 300) },
    });
    if (res.count === 0) return false;

    await tx.orderEvent.create({
      data: { orderId, status: "PENDING", note: `Payment failed: ${reason}`.slice(0, 300) },
    });
    return true;
  });
}
