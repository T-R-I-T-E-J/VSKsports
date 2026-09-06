import { describe, it, expect, afterAll, vi } from "vitest";

// `settleOrderPaid` calls revalidatePath and fires a confirmation email. Neither
// is the behaviour under test, and both need a request scope that does not exist
// in a test run — stub them so the transaction itself is what is exercised.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/email/mailer", () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

const { settleOrderPaid, markOrderFailed } = await import("@/lib/orders");
const { prisma, createProduct, createPendingOrder, createUser, cleanup } = await import(
  "@/test/fixtures"
);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

/**
 * Settlement is the most intricate logic in the application and had no test at
 * all. Its exactly-once guarantee lived entirely in code comments, which do not
 * fail a build — a refactor moving the status lock outside the transaction would
 * silently reintroduce double stock decrement.
 */
describe("settleOrderPaid", () => {
  it("settles once and decrements stock once when called twice", async () => {
    const { productId } = await createProduct({ stock: 10 });
    const order = await createPendingOrder({ productId, quantity: 3 });

    const first = await settleOrderPaid(order.id, "pay_first");
    const second = await settleOrderPaid(order.id, "pay_second");

    // Only the caller that won the lock reports having settled it.
    expect(first).toBe(true);
    expect(second).toBe(false);

    const inv = await prisma.inventoryItem.findFirst({ where: { productId } });
    // 10 - 3, applied exactly once despite two settlement calls.
    expect(inv?.stock).toBe(7);

    const settled = await prisma.order.findUnique({ where: { id: order.id } });
    expect(settled?.paymentStatus).toBe("PAID");
    expect(settled?.status).toBe("PROCESSING");
    // The losing call must not overwrite the winning payment reference.
    expect(settled?.razorpayPaymentId).toBe("pay_first");

    const events = await prisma.orderEvent.findMany({ where: { orderId: order.id } });
    expect(events).toHaveLength(1);
  });

  it("survives concurrent settlement without double-decrementing", async () => {
    const { productId } = await createProduct({ stock: 10 });
    const order = await createPendingOrder({ productId, quantity: 2 });

    // The real race: the browser confirmation and the webhook arriving together.
    const results = await Promise.all([
      settleOrderPaid(order.id, "pay_a"),
      settleOrderPaid(order.id, "pay_b"),
      settleOrderPaid(order.id, "pay_c"),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    const inv = await prisma.inventoryItem.findFirst({ where: { productId } });
    expect(inv?.stock).toBe(8);
  });

  it("refuses to re-settle a REFUNDED order", async () => {
    const { productId } = await createProduct({ stock: 10 });
    const order = await createPendingOrder({ productId, quantity: 1 });
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "REFUNDED" },
    });

    const settled = await settleOrderPaid(order.id, "pay_replay");

    // This is why SETTLEABLE_FROM names its statuses instead of using
    // `not: "PAID"` — a replayed capture must not resurrect a refunded order.
    expect(settled).toBe(false);
    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after?.paymentStatus).toBe("REFUNDED");
    const inv = await prisma.inventoryItem.findFirst({ where: { productId } });
    expect(inv?.stock).toBe(10);
  });

  it("never drives stock negative, and records the shortfall", async () => {
    const { productId } = await createProduct({ stock: 1 });
    const order = await createPendingOrder({ productId, quantity: 5 });

    const settled = await settleOrderPaid(order.id, "pay_short");

    // The payment is already captured, so the order still settles — but stock
    // floors at zero rather than going negative, and the event says why.
    expect(settled).toBe(true);
    const inv = await prisma.inventoryItem.findFirst({ where: { productId } });
    expect(inv?.stock).toBe(0);

    const event = await prisma.orderEvent.findFirst({ where: { orderId: order.id } });
    expect(event?.note).toContain("STOCK SHORTFALL");
  });

  it("clears the buyer's cart on settlement", async () => {
    const user = await createUser();
    const { productId } = await createProduct({ stock: 5 });
    const cart = await prisma.cart.create({
      data: { token: `${order_token()}`, userId: user.id },
    });
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity: 1, variantLabel: "" },
    });
    const order = await createPendingOrder({ userId: user.id, productId, quantity: 1 });

    await settleOrderPaid(order.id, "pay_cart");

    const remaining = await prisma.cartItem.count({ where: { cartId: cart.id } });
    expect(remaining).toBe(0);
  });
});

describe("markOrderFailed", () => {
  it("cannot downgrade an order that is already PAID", async () => {
    const { productId } = await createProduct({ stock: 5 });
    const order = await createPendingOrder({ productId, quantity: 1 });
    await settleOrderPaid(order.id, "pay_ok");

    // Razorpay emits payment.failed for an earlier attempt on an order that has
    // since succeeded on retry. That must not undo the settlement.
    const failed = await markOrderFailed(order.id, "late failure");

    expect(failed).toBe(false);
    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after?.paymentStatus).toBe("PAID");
  });

  it("records a failure with an explanatory event", async () => {
    const { productId } = await createProduct({ stock: 5 });
    const order = await createPendingOrder({ productId, quantity: 1 });

    const failed = await markOrderFailed(order.id, "card declined");

    expect(failed).toBe(true);
    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after?.paymentStatus).toBe("FAILED");
    expect(after?.failureReason).toBe("card declined");
    const event = await prisma.orderEvent.findFirst({ where: { orderId: order.id } });
    expect(event?.note).toContain("card declined");
  });
});

function order_token() {
  return `vitest-cart-${Math.random().toString(36).slice(2, 12)}`;
}
