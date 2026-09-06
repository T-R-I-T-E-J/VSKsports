import { cache } from "react";
import { prisma } from "@/lib/db";
import { DEFAULT_PRICING, type PricingConfig } from "@/lib/pricing";

/**
 * Admin-editable settings, stored as Setting key/value rows.
 *
 * SERVER ONLY. There is no `server-only` guard because the package is not a
 * dependency and nothing else here uses it; the Prisma import already makes
 * this module unusable from a client component, and Next fails the build if one
 * tries. Client components receive the resolved config as a prop instead — see
 * CheckoutFlow. Keep lib/pricing.ts free of this import so it stays isomorphic.
 *
 * Only the keys listed here are recognised. `saveSettings` writes through this
 * same allow-list, so a crafted POST cannot fill the table with arbitrary keys,
 * and a typo in the form cannot silently create a setting nothing reads.
 */
export const PRICING_KEYS = {
  gstRate: "pricing.gstRate",
  freeShippingThresholdInr: "pricing.freeShippingThresholdInr",
  standardShippingInr: "pricing.standardShippingInr",
  expressShippingInr: "pricing.expressShippingInr",
} as const;

export type PricingKey = keyof typeof PRICING_KEYS;

/**
 * Bounds for each field. These are sanity limits, not business policy: they
 * exist so a fat-fingered entry cannot make the shop charge something absurd.
 * A GST rate is a fraction, so anything at or above 1 is certainly a percent
 * typed into a rate field.
 */
const BOUNDS: Record<PricingKey, { min: number; max: number; integer: boolean; label: string }> = {
  gstRate: { min: 0, max: 0.5, integer: false, label: "GST rate" },
  freeShippingThresholdInr: { min: 0, max: 1_000_000, integer: true, label: "Free delivery threshold" },
  standardShippingInr: { min: 0, max: 100_000, integer: true, label: "Standard delivery charge" },
  expressShippingInr: { min: 0, max: 100_000, integer: true, label: "Express delivery charge" },
};

/** Validate one field. Returns the parsed number, or an error message. */
export function parsePricingField(
  field: PricingKey,
  raw: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const b = BOUNDS[field];
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, error: `${b.label} is required.` };
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return { ok: false, error: `${b.label} must be a number.` };
  if (b.integer && !Number.isInteger(n)) return { ok: false, error: `${b.label} must be a whole number of rupees.` };
  if (n < b.min || n > b.max) return { ok: false, error: `${b.label} must be between ${b.min} and ${b.max}.` };
  return { ok: true, value: n };
}

/**
 * Current pricing configuration, falling back to DEFAULT_PRICING per field.
 *
 * FAILS SAFE: a missing row, an unparseable value or an unreachable database
 * yields the default rather than throwing. Checkout must not break because a
 * settings row is malformed — it should quietly charge what it always charged.
 *
 * `cache()` dedupes this within a single request/render, so a page that shows
 * totals in several places issues one query, not several. It deliberately does
 * NOT cache across requests: an admin changing the GST rate expects the next
 * page load to reflect it.
 */
export const getPricingConfig = cache(async (): Promise<PricingConfig> => {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: Object.values(PRICING_KEYS) } },
      select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const cfg = { ...DEFAULT_PRICING };
    for (const field of Object.keys(PRICING_KEYS) as PricingKey[]) {
      const raw = byKey.get(PRICING_KEYS[field]);
      if (raw === undefined) continue;
      const parsed = parsePricingField(field, raw);
      if (parsed.ok) cfg[field] = parsed.value;
      else console.error(`[settings] ignoring invalid ${PRICING_KEYS[field]}=${raw}: ${parsed.error}`);
    }
    return cfg;
  } catch (err) {
    console.error("[settings] could not load pricing config, using defaults:", err);
    return { ...DEFAULT_PRICING };
  }
});
