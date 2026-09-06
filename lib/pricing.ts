/**
 * Order arithmetic. Deliberately PURE and isomorphic — no database import, no
 * "server-only" — because the checkout and bulk-order forms are client
 * components that must show the customer the same figures the server will
 * charge. Anything that touches Prisma belongs in lib/settings.ts instead.
 *
 * Rates are parameters rather than constants so an admin can correct them
 * without a deploy (see lib/settings.ts and /admin/settings). The parameter
 * DEFAULTS to the values that were previously hardcoded, so a call site that
 * passes no config behaves exactly as it did before.
 */

export type PricingConfig = {
  /** Fraction, not percent: 0.05 is 5%. */
  gstRate: number;
  /** Order subtotal at or above which standard delivery is free. */
  freeShippingThresholdInr: number;
  standardShippingInr: number;
  expressShippingInr: number;
};

/**
 * The values this shop launched with.
 *
 * GST: 5% is what the original code charged. Rates for sporting goods (HSN
 * 9506) are commonly higher, so this is a business decision, not a code one —
 * it is settable at /admin/settings precisely so correcting it does not need
 * an engineer.
 */
export const DEFAULT_PRICING: PricingConfig = {
  gstRate: 0.05,
  freeShippingThresholdInr: 2000,
  standardShippingInr: 150,
  expressShippingInr: 450,
};

export type ShippingMethod = "standard" | "express" | "pickup";

/** Display label derived from the rate so the UI can never drift from the math. */
export function gstLabel(cfg: PricingConfig = DEFAULT_PRICING): string {
  const pct = cfg.gstRate * 100;
  // Avoid "12.5%" rendering as "13%", but keep whole numbers clean.
  const shown = Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `GST (${shown}%)`;
}

/**
 * Label for an order that has ALREADY been placed, derived from what was
 * actually charged rather than from today's configured rate.
 *
 * Historical orders are the reason this exists: if the rate is corrected from
 * 5% to 12%, an invoice printed from the current config would claim a customer
 * paid 12% when their stored gstInr says otherwise. Deriving the rate from the
 * stored amounts keeps every past invoice truthful, which is the version a tax
 * authority would care about.
 */
export function gstLabelForOrder(subtotalInr: number, gstInr: number): string {
  if (subtotalInr <= 0) return "GST";
  const pct = (gstInr / subtotalInr) * 100;
  const rounded = Math.round(pct * 100) / 100;
  return `GST (${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}%)`;
}

export function shippingCost(
  method: ShippingMethod,
  subtotalInr: number,
  cfg: PricingConfig = DEFAULT_PRICING,
): number {
  if (method === "express") return cfg.expressShippingInr;
  if (method === "pickup") return 0;
  return subtotalInr >= cfg.freeShippingThresholdInr ? 0 : cfg.standardShippingInr;
}

export type Totals = {
  subtotalInr: number;
  gstInr: number;
  shippingInr: number;
  discountInr: number;
  totalInr: number;
};

/**
 * GST is charged on the goods subtotal; shipping is added after, and any
 * discount comes off the end.
 *
 * The discount is clamped to the goods subtotal rather than the grand total:
 * a coupon may take the goods to zero but must never refund tax or shipping,
 * which would let a large enough code produce a negative charge.
 */
export function computeTotals(
  subtotalInr: number,
  method: ShippingMethod = "standard",
  discountInr = 0,
  cfg: PricingConfig = DEFAULT_PRICING,
): Totals {
  const capped = Math.min(Math.max(0, Math.round(discountInr)), subtotalInr);
  const gstInr = Math.round(subtotalInr * cfg.gstRate);
  const shippingInr = shippingCost(method, subtotalInr, cfg);
  const totalInr = Math.max(0, subtotalInr + gstInr + shippingInr - capped);
  return { subtotalInr, gstInr, shippingInr, discountInr: capped, totalInr };
}
