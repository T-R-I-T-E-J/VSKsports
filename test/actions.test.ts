import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

/**
 * `redirect()` throws a framework control-flow signal in real Next. Mirror that
 * with a recognisable error so a test can assert WHERE an action redirected to
 * — which is how these actions report both success and refusal.
 */
class Redirected extends Error {
  constructor(public to: string) {
    super(`redirect:${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
}));

const { redeemReward } = await import("@/app/actions/rewards");
const { createReturn } = await import("@/app/actions/returns");
const { prisma, TEST_TAG, createUser, createProduct, createPendingOrder, cleanup } = await import(
  "@/test/fixtures"
);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

beforeEach(() => authMock.mockReset());

/** Run an action that is expected to redirect, and return the destination. */
async function captureRedirect(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof Redirected) return e.to;
    throw e;
  }
  throw new Error("expected a redirect, but the action returned normally");
}

const form = (entries: [string, string][]) => {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
};

describe("redeemReward", () => {
  /**
   * Regression guard for audit finding N-2.
   *
   * The balance was read, compared to the cost, then decremented — inside a
   * transaction, but with no row lock, so two parallel redemptions both saw the
   * same pre-decrement total and both spent it. The customer ended on a negative
   * balance with two fulfilment requests for one payment.
   */
  it("cannot spend the same points twice under concurrency", async () => {
    const user = await createUser({ loyaltyPoints: 500 });
    const reward = await prisma.rewardItem.create({
      data: { title: `${TEST_TAG}-reward`, pointsCost: 500, active: true },
    });
    authMock.mockResolvedValue({ user: { id: user.id, role: "CUSTOMER" } });

    // Two simultaneous redemptions, each costing the entire balance.
    const outcomes = await Promise.allSettled([
      redeemReward(form([["rewardItemId", reward.id]])),
      redeemReward(form([["rewardItemId", reward.id]])),
    ]);

    const destinations = outcomes.map((o) =>
      o.status === "rejected" && o.reason instanceof Redirected ? o.reason.to : "unknown",
    );
    // Exactly one redemption succeeds; the other is refused for lack of points.
    expect(destinations.filter((d) => d.includes("redeemed=1"))).toHaveLength(1);
    expect(destinations.filter((d) => d.includes("error=points"))).toHaveLength(1);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.loyaltyPoints).toBe(0);

    const redemptions = await prisma.rewardRedemption.count({ where: { userId: user.id } });
    expect(redemptions).toBe(1);

    // The ledger must agree with the balance.
    const ledger = await prisma.rewardLedger.findMany({ where: { userId: user.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]!.points).toBe(-500);
  });

  it("refuses a redemption the balance cannot cover", async () => {
    const user = await createUser({ loyaltyPoints: 100 });
    const reward = await prisma.rewardItem.create({
      data: { title: `${TEST_TAG}-expensive`, pointsCost: 5_000, active: true },
    });
    authMock.mockResolvedValue({ user: { id: user.id, role: "CUSTOMER" } });

    const to = await captureRedirect(() => redeemReward(form([["rewardItemId", reward.id]])));

    expect(to).toContain("error=points");
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.loyaltyPoints).toBe(100);
  });

  it("rejects an anonymous caller", async () => {
    authMock.mockResolvedValue(null);
    await expect(redeemReward(form([["rewardItemId", "whatever"]]))).rejects.toThrow(
      "Not authenticated",
    );
  });
});

describe("createReturn", () => {
  async function eligibleOrder() {
    const user = await createUser();
    const { productId } = await createProduct({ stock: 5 });
    const order = await createPendingOrder({ userId: user.id, productId, quantity: 1 });
    await prisma.order.update({ where: { id: order.id }, data: { status: "DELIVERED" } });
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    return { user, order, item };
  }

  /**
   * Regression guard for audit finding N-4. Ownership and eligibility were
   * checked, but nothing stopped the same items being returned again — a double
   * click produced two live RMAs for one physical item, and because refunds are
   * issued by hand that invites a duplicate refund.
   */
  it("refuses a second return for items already under RMA", async () => {
    const { user, order, item } = await eligibleOrder();
    authMock.mockResolvedValue({ user: { id: user.id, role: "CUSTOMER" } });

    const first = await captureRedirect(() =>
      createReturn(form([["orderId", order.id], ["reason", "Damaged"], ["items", item.id]])),
    );
    expect(first).toContain("submitted=");

    const second = await captureRedirect(() =>
      createReturn(form([["orderId", order.id], ["reason", "Damaged again"], ["items", item.id]])),
    );
    expect(second).toContain("error=alreadyreturned");

    const returns = await prisma.return.count({ where: { orderId: order.id } });
    expect(returns).toBe(1);
  });

  it("releases the items again once a return is rejected", async () => {
    const { user, order, item } = await eligibleOrder();
    authMock.mockResolvedValue({ user: { id: user.id, role: "CUSTOMER" } });

    await captureRedirect(() =>
      createReturn(form([["orderId", order.id], ["reason", "Wrong size"], ["items", item.id]])),
    );
    await prisma.return.updateMany({ where: { orderId: order.id }, data: { status: "REJECTED" } });

    const retry = await captureRedirect(() =>
      createReturn(form([["orderId", order.id], ["reason", "Second attempt"], ["items", item.id]])),
    );

    expect(retry).toContain("submitted=");
    expect(await prisma.return.count({ where: { orderId: order.id } })).toBe(2);
  });

  it("refuses a return against someone else's order", async () => {
    const { order, item } = await eligibleOrder();
    const attacker = await createUser();
    authMock.mockResolvedValue({ user: { id: attacker.id, role: "CUSTOMER" } });

    await expect(
      createReturn(form([["orderId", order.id], ["reason", "Mine now"], ["items", item.id]])),
    ).rejects.toThrow("Order not found or not eligible");
  });

  it("refuses a return on an order that has not shipped", async () => {
    const { user, order, item } = await eligibleOrder();
    await prisma.order.update({ where: { id: order.id }, data: { status: "PENDING" } });
    authMock.mockResolvedValue({ user: { id: user.id, role: "CUSTOMER" } });

    await expect(
      createReturn(form([["orderId", order.id], ["reason", "Too early"], ["items", item.id]])),
    ).rejects.toThrow("Order not found or not eligible");
  });
});
