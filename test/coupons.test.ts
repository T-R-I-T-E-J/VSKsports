import { describe, it, expect, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { checkCoupon, redeemCoupon, discountFor, normaliseCode } from "@/lib/coupons";
import { prisma, TEST_TAG, createUser, cleanup } from "@/test/fixtures";

const codes: string[] = [];

async function makeCoupon(overrides: {
  type?: "FLAT" | "PERCENT";
  value?: number;
  minOrderInr?: number | null;
  active?: boolean;
  expiresAt?: Date | null;
  maxRedemptions?: number | null;
  perUserLimit?: number | null;
} = {}) {
  const code = `${TEST_TAG}-${randomUUID().slice(0, 8)}`.toUpperCase();
  codes.push(code);
  return prisma.coupon.create({
    data: {
      code,
      type: overrides.type ?? "FLAT",
      value: overrides.value ?? 500,
      minOrderInr: overrides.minOrderInr ?? null,
      active: overrides.active ?? true,
      expiresAt: overrides.expiresAt ?? null,
      maxRedemptions: overrides.maxRedemptions ?? null,
      perUserLimit: overrides.perUserLimit ?? null,
    },
  });
}

afterEach(async () => {
  if (codes.length) {
    await prisma.order.updateMany({ where: { coupon: { code: { in: codes } } }, data: { couponId: null } });
    await prisma.coupon.deleteMany({ where: { code: { in: codes } } });
    codes.length = 0;
  }
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("discountFor", () => {
  it("computes a flat discount", () => {
    expect(discountFor({ type: "FLAT", value: 500 }, 10_000)).toBe(500);
  });

  it("computes a percentage discount", () => {
    expect(discountFor({ type: "PERCENT", value: 10 }, 10_000)).toBe(1000);
  });

  /**
   * A coupon must never exceed the goods it discounts. Without this, a ₹5,000
   * FLAT code on a ₹1,000 basket would try to refund tax and delivery.
   */
  it("never discounts more than the subtotal", () => {
    expect(discountFor({ type: "FLAT", value: 5000 }, 1000)).toBe(1000);
    expect(discountFor({ type: "PERCENT", value: 150 }, 1000)).toBe(1000);
  });

  it("normalises codes for lookup", () => {
    expect(normaliseCode("  save10 ")).toBe("SAVE10");
  });
});

describe("checkCoupon", () => {
  it("accepts a valid code", async () => {
    const c = await makeCoupon({ value: 500 });
    const r = await checkCoupon(c.code, 10_000, null);
    expect(r).toMatchObject({ ok: true, discountInr: 500 });
  });

  it("is case- and whitespace-insensitive", async () => {
    const c = await makeCoupon();
    const r = await checkCoupon(`  ${c.code.toLowerCase()}  `, 10_000, null);
    expect(r.ok).toBe(true);
  });

  it("rejects an unknown code", async () => {
    const r = await checkCoupon("NOPE-DOES-NOT-EXIST", 10_000, null);
    expect(r).toMatchObject({ ok: false, reason: "NOT_FOUND" });
  });

  it("rejects a deactivated code", async () => {
    const c = await makeCoupon({ active: false });
    expect(await checkCoupon(c.code, 10_000, null)).toMatchObject({ reason: "INACTIVE" });
  });

  it("rejects an expired code", async () => {
    const c = await makeCoupon({ expiresAt: new Date(Date.now() - 60_000) });
    expect(await checkCoupon(c.code, 10_000, null)).toMatchObject({ reason: "EXPIRED" });
  });

  it("enforces minimum spend", async () => {
    const c = await makeCoupon({ minOrderInr: 5000 });
    expect(await checkCoupon(c.code, 4999, null)).toMatchObject({ reason: "BELOW_MINIMUM" });
    expect((await checkCoupon(c.code, 5000, null)).ok).toBe(true);
  });

  it("reports an exhausted code", async () => {
    const c = await makeCoupon({ maxRedemptions: 1 });
    await prisma.coupon.update({ where: { id: c.id }, data: { timesUsed: 1 } });
    expect(await checkCoupon(c.code, 10_000, null)).toMatchObject({ reason: "EXHAUSTED" });
  });
});

describe("redeemCoupon", () => {
  it("consumes one redemption", async () => {
    const c = await makeCoupon({ maxRedemptions: 3 });
    const user = await createUser();
    const r = await prisma.$transaction((tx) => redeemCoupon(tx, c.code, 10_000, user.id));
    expect(r.ok).toBe(true);
    const after = await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.timesUsed).toBe(1);
  });

  /**
   * THE RACE. Two customers reaching for the last redemption at the same moment
   * both read timesUsed = 0 against a cap of 1. A read-then-write would let both
   * through and oversell the promotion; the conditional UPDATE must let exactly
   * one win.
   */
  it("never exceeds the cap under concurrency", async () => {
    const CAP = 5;
    const ATTEMPTS = 30;
    const c = await makeCoupon({ maxRedemptions: CAP });
    const user = await createUser();

    const results = await Promise.all(
      Array.from({ length: ATTEMPTS }, () =>
        prisma
          .$transaction((tx) => redeemCoupon(tx, c.code, 10_000, user.id))
          .catch(() => ({ ok: false as const, reason: "EXHAUSTED" as const, message: "" })),
      ),
    );

    const granted = results.filter((r) => r.ok).length;
    expect(granted).toBe(CAP);

    const after = await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.timesUsed).toBe(CAP);
    expect(after.timesUsed).toBeLessThanOrEqual(CAP);
  });

  it("refuses once the cap is reached", async () => {
    const c = await makeCoupon({ maxRedemptions: 1 });
    const user = await createUser();
    await prisma.$transaction((tx) => redeemCoupon(tx, c.code, 10_000, user.id));
    const second = await prisma.$transaction((tx) => redeemCoupon(tx, c.code, 10_000, user.id));
    expect(second).toMatchObject({ ok: false, reason: "EXHAUSTED" });
  });

  it("rolls the redemption back when the surrounding transaction fails", async () => {
    const c = await makeCoupon({ maxRedemptions: 2 });
    const user = await createUser();

    await expect(
      prisma.$transaction(async (tx) => {
        const r = await redeemCoupon(tx, c.code, 10_000, user.id);
        expect(r.ok).toBe(true);
        // Simulates the order write failing after the redemption is taken.
        throw new Error("order write failed");
      }),
    ).rejects.toThrow("order write failed");

    const after = await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.timesUsed).toBe(0);
  });

  it("enforces a per-customer limit across separate orders", async () => {
    const c = await makeCoupon({ perUserLimit: 1 });
    const user = await createUser();

    const first = await prisma.$transaction((tx) => redeemCoupon(tx, c.code, 10_000, user.id));
    expect(first.ok).toBe(true);

    // The limit counts the customer's orders, so it only bites once an order
    // actually carries the coupon.
    await prisma.order.create({
      data: {
        number: `${TEST_TAG}-ord-${randomUUID().slice(0, 8)}`,
        userId: user.id,
        status: "PENDING",
        paymentStatus: "PENDING",
        subtotalInr: 10_000,
        gstInr: 500,
        shippingInr: 0,
        discountInr: 500,
        totalInr: 10_000,
        couponId: c.id,
      },
    });

    const second = await prisma.$transaction((tx) => redeemCoupon(tx, c.code, 10_000, user.id));
    expect(second).toMatchObject({ ok: false, reason: "USER_LIMIT" });
  });
});
