import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Coupon validation and redemption.
 *
 * Coupons were half-built: staff could create them and orders had a couponId
 * column, but nothing on the storefront could ever apply one. This module is
 * the missing half.
 *
 * The redemption cap is enforced with a conditional UPDATE rather than a
 * read-then-write, for the same reason as every other counter in this codebase:
 * two customers checking out at once would both read `timesUsed = 99` against a
 * cap of 100 and both proceed. "Check, then act" is the bug class this project
 * has already been bitten by four times.
 */

export type CouponFailure =
  | "NOT_FOUND"
  | "INACTIVE"
  | "EXPIRED"
  | "BELOW_MINIMUM"
  | "EXHAUSTED"
  | "USER_LIMIT";

export type CouponCheck =
  | { ok: true; couponId: string; code: string; discountInr: number }
  | { ok: false; reason: CouponFailure; message: string };

/** Customer-facing wording. Deliberately vague about *why* a code is unusable
 *  beyond what the customer can act on — enumerating codes should not be a
 *  reconnaissance tool. */
export const COUPON_MESSAGES: Record<CouponFailure, string> = {
  NOT_FOUND: "That code isn't valid.",
  INACTIVE: "That code isn't valid.",
  EXPIRED: "That code has expired.",
  BELOW_MINIMUM: "Your order doesn't meet this code's minimum spend.",
  EXHAUSTED: "That code has been fully redeemed.",
  USER_LIMIT: "You've already used that code.",
};

/** Normalise for lookup — codes are stored and compared uppercase, trimmed. */
export function normaliseCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Discount for a coupon against a goods subtotal, in whole rupees.
 *
 * Never exceeds the subtotal: a percentage above 100, or a flat value larger
 * than the basket, must not turn into a refund of tax and delivery.
 * `computeTotals` clamps again as a second line of defence.
 */
export function discountFor(
  coupon: { type: "FLAT" | "PERCENT"; value: number },
  subtotalInr: number,
): number {
  if (subtotalInr <= 0) return 0;
  const raw =
    coupon.type === "PERCENT"
      ? Math.round((subtotalInr * coupon.value) / 100)
      : Math.round(coupon.value);
  return Math.max(0, Math.min(raw, subtotalInr));
}

/**
 * Validate a code against a subtotal WITHOUT consuming a redemption.
 *
 * Used when the customer applies a code to their cart and when the cart/checkout
 * pages render, so the figure shown matches what will be charged. The
 * authoritative consumption happens in `redeemCoupon`.
 */
export async function checkCoupon(
  rawCode: string,
  subtotalInr: number,
  userId: string | null,
): Promise<CouponCheck> {
  const code = normaliseCode(rawCode);
  if (!code) return fail("NOT_FOUND");

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return fail("NOT_FOUND");
  if (!coupon.active) return fail("INACTIVE");
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) return fail("EXPIRED");
  if (coupon.minOrderInr != null && subtotalInr < coupon.minOrderInr) return fail("BELOW_MINIMUM");
  if (coupon.maxRedemptions != null && coupon.timesUsed >= coupon.maxRedemptions) {
    return fail("EXHAUSTED");
  }

  if (userId && coupon.perUserLimit != null) {
    const used = await countUserRedemptions(prisma, coupon.id, userId);
    if (used >= coupon.perUserLimit) return fail("USER_LIMIT");
  }

  const discountInr = discountFor(coupon, subtotalInr);
  return { ok: true, couponId: coupon.id, code: coupon.code, discountInr };
}

/**
 * How many times this customer has already redeemed this coupon.
 *
 * Cancelled orders are excluded so a cancellation gives the allowance back;
 * everything else counts, including orders still awaiting payment, so that
 * opening several checkouts cannot multiply the allowance.
 */
function countUserRedemptions(
  client: Prisma.TransactionClient | typeof prisma,
  couponId: string,
  userId: string,
): Promise<number> {
  return client.order.count({
    where: { couponId, userId, status: { not: "CANCELLED" } },
  });
}

/**
 * Consume one redemption, atomically.
 *
 * Returns the discount to charge, or a failure if the coupon became unusable
 * between validation and here. MUST be called inside the same transaction that
 * creates the order, so a failure to write the order also releases the
 * redemption.
 */
export async function redeemCoupon(
  tx: Prisma.TransactionClient,
  rawCode: string,
  subtotalInr: number,
  userId: string,
): Promise<CouponCheck> {
  const code = normaliseCode(rawCode);
  if (!code) return fail("NOT_FOUND");

  const coupon = await tx.coupon.findUnique({ where: { code } });
  if (!coupon) return fail("NOT_FOUND");
  if (!coupon.active) return fail("INACTIVE");
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) return fail("EXPIRED");
  if (coupon.minOrderInr != null && subtotalInr < coupon.minOrderInr) return fail("BELOW_MINIMUM");

  if (coupon.perUserLimit != null) {
    const used = await countUserRedemptions(tx, coupon.id, userId);
    if (used >= coupon.perUserLimit) return fail("USER_LIMIT");
  }

  // The global cap, enforced in ONE statement. `timesUsed < maxRedemptions` is
  // a column-to-column comparison, which is why this is raw SQL rather than the
  // usual conditional updateMany — Prisma's filter API cannot express it.
  // Postgres evaluates the predicate against the row it locks, so exactly
  // `maxRedemptions` callers can ever succeed regardless of interleaving.
  const updated = await tx.$executeRaw`
    UPDATE "Coupon"
       SET "timesUsed" = "timesUsed" + 1
     WHERE "id" = ${coupon.id}
       AND ("maxRedemptions" IS NULL OR "timesUsed" < "maxRedemptions")
  `;
  if (updated === 0) return fail("EXHAUSTED");

  return {
    ok: true,
    couponId: coupon.id,
    code: coupon.code,
    discountInr: discountFor(coupon, subtotalInr),
  };
}

function fail(reason: CouponFailure): CouponCheck {
  return { ok: false, reason, message: COUPON_MESSAGES[reason] };
}
