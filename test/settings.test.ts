import { describe, it, expect, afterAll, afterEach } from "vitest";
import { parsePricingField, getPricingConfig, PRICING_KEYS } from "@/lib/settings";
import { DEFAULT_PRICING } from "@/lib/pricing";
import { prisma } from "@/test/fixtures";

/**
 * getPricingConfig is React-`cache`d, which dedupes within a request. Outside a
 * request the cache is per-call-scope, so each test reads the database fresh —
 * but assert that explicitly rather than assume it.
 */
async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

afterEach(async () => {
  // Scoped to the four pricing keys this suite writes — never a broad delete.
  await prisma.setting.deleteMany({ where: { key: { in: Object.values(PRICING_KEYS) } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("parsePricingField", () => {
  it("accepts a sane GST rate", () => {
    expect(parsePricingField("gstRate", "0.12")).toEqual({ ok: true, value: 0.12 });
  });

  /**
   * The single most likely data-entry error: typing "12" into a field that
   * wants a fraction. Unrejected, that would charge 1200% GST — an order of
   * ₹10,000 would bill ₹1,30,000.
   */
  it("rejects a percentage typed into the rate field", () => {
    const r = parsePricingField("gstRate", "12");
    expect(r.ok).toBe(false);
  });

  it("rejects a negative rate", () => {
    expect(parsePricingField("gstRate", "-0.05").ok).toBe(false);
  });

  it("rejects non-numeric and empty input", () => {
    expect(parsePricingField("standardShippingInr", "free").ok).toBe(false);
    expect(parsePricingField("standardShippingInr", "   ").ok).toBe(false);
  });

  it("requires whole rupees for money fields", () => {
    expect(parsePricingField("standardShippingInr", "150.5").ok).toBe(false);
    expect(parsePricingField("standardShippingInr", "150")).toEqual({ ok: true, value: 150 });
  });

  it("allows zero shipping (a legitimate free-delivery policy)", () => {
    expect(parsePricingField("standardShippingInr", "0")).toEqual({ ok: true, value: 0 });
  });
});

describe("getPricingConfig", () => {
  it("returns the launch defaults when nothing is stored", async () => {
    const cfg = await getPricingConfig();
    expect(cfg).toEqual(DEFAULT_PRICING);
  });

  it("applies a stored override", async () => {
    await setSetting(PRICING_KEYS.gstRate, "0.12");
    await setSetting(PRICING_KEYS.standardShippingInr, "99");
    const cfg = await getPricingConfig();
    expect(cfg.gstRate).toBe(0.12);
    expect(cfg.standardShippingInr).toBe(99);
    // Untouched fields keep their defaults rather than becoming undefined.
    expect(cfg.expressShippingInr).toBe(DEFAULT_PRICING.expressShippingInr);
  });

  /**
   * FAIL-SAFE. A malformed row must not take checkout down or, worse, charge a
   * nonsense amount. It falls back to the default for that field and logs.
   */
  it("ignores a corrupt stored value and falls back to the default", async () => {
    await setSetting(PRICING_KEYS.gstRate, "not-a-number");
    const cfg = await getPricingConfig();
    expect(cfg.gstRate).toBe(DEFAULT_PRICING.gstRate);
  });

  it("ignores an out-of-bounds stored value", async () => {
    // Someone edits the row directly in the database, bypassing the form.
    await setSetting(PRICING_KEYS.gstRate, "9");
    const cfg = await getPricingConfig();
    expect(cfg.gstRate).toBe(DEFAULT_PRICING.gstRate);
  });
});
