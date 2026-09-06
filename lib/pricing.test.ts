import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICING,
  computeTotals,
  gstLabel,
  gstLabelForOrder,
  shippingCost,
  type PricingConfig,
} from "./pricing";

// Regression guard: this is the second time a stray hardcoded 18% drifted from
// the real rate. Pin the defaults, the derived label, and the totals formula so
// a silent rate change can never ship green again.
describe("pricing — defaults", () => {
  it("keeps the rates the shop launched with", () => {
    expect(DEFAULT_PRICING).toEqual({
      gstRate: 0.05,
      freeShippingThresholdInr: 2000,
      standardShippingInr: 150,
      expressShippingInr: 450,
    });
  });

  it("derives the label from the rate, never hardcoding it", () => {
    expect(gstLabel()).toBe("GST (5%)");
    expect(gstLabel({ ...DEFAULT_PRICING, gstRate: 0.12 })).toBe("GST (12%)");
    // A fractional rate must not round to a wrong whole number on the invoice.
    expect(gstLabel({ ...DEFAULT_PRICING, gstRate: 0.125 })).toBe("GST (12.5%)");
  });

  it("charges GST on the subtotal; pickup has no shipping", () => {
    const t = computeTotals(10000, "pickup");
    expect(t.gstInr).toBe(500);
    expect(t.totalInr).toBe(10500);
  });

  it("adds flat shipping below the free-shipping threshold", () => {
    const t = computeTotals(1000, "standard");
    expect(t.gstInr).toBe(50);
    expect(t.shippingInr).toBe(150);
    expect(t.totalInr).toBe(1200);
  });

  it("gives free standard shipping at/above the threshold", () => {
    const t = computeTotals(2000, "standard");
    expect(t.shippingInr).toBe(0);
    expect(t.totalInr).toBe(2100);
  });
});

describe("pricing — configurable rates", () => {
  const cfg: PricingConfig = {
    gstRate: 0.12,
    freeShippingThresholdInr: 5000,
    standardShippingInr: 99,
    expressShippingInr: 299,
  };

  it("applies a corrected GST rate to the charge, not just the label", () => {
    const t = computeTotals(10_000, "pickup", 0, cfg);
    expect(t.gstInr).toBe(1200);
    expect(t.totalInr).toBe(11_200);
  });

  it("honours a configured free-shipping threshold", () => {
    // 2000 was free under the defaults; under this config it is not.
    expect(shippingCost("standard", 2000, cfg)).toBe(99);
    expect(shippingCost("standard", 5000, cfg)).toBe(0);
    expect(shippingCost("express", 99_999, cfg)).toBe(299);
    expect(shippingCost("pickup", 1, cfg)).toBe(0);
  });

  it("leaves every unconfigured call site on the original behaviour", () => {
    // The whole point of the default parameter: code that passes no config
    // must charge exactly what it charged before rates became settable.
    expect(computeTotals(1000, "standard")).toEqual(computeTotals(1000, "standard", 0, DEFAULT_PRICING));
  });
});

describe("pricing — discount clamping", () => {
  it("never produces a negative charge", () => {
    // Was 0 before the discount was clamped: an oversized discount used to eat
    // the tax too. Now the goods go to zero and the GST stays payable.
    const t = computeTotals(1000, "pickup", 5000);
    expect(t.totalInr).toBe(50);
    expect(t.totalInr).toBeGreaterThanOrEqual(0);
  });

  /**
   * A discount larger than the goods must not refund tax or delivery. Clamping
   * to the subtotal means the customer still pays GST and shipping on a fully
   * discounted order rather than the shop paying them.
   */
  it("clamps the discount to the goods subtotal, so tax and shipping still stand", () => {
    const t = computeTotals(1000, "standard", 100_000);
    expect(t.discountInr).toBe(1000);
    expect(t.gstInr).toBe(50);
    expect(t.shippingInr).toBe(150);
    expect(t.totalInr).toBe(200); // tax + shipping remain payable
  });

  it("ignores a negative discount rather than inflating the charge", () => {
    const t = computeTotals(1000, "pickup", -500);
    expect(t.discountInr).toBe(0);
    expect(t.totalInr).toBe(1050);
  });
});

describe("gstLabelForOrder", () => {
  /**
   * Historical invoices must report what was actually charged. If the shop's
   * rate is corrected from 5% to 12%, an old order still says 5% — reading the
   * rate from today's config would retroactively misstate every past invoice.
   */
  it("derives the rate from the stored amounts, not the current config", () => {
    expect(gstLabelForOrder(10_000, 500)).toBe("GST (5%)");
    expect(gstLabelForOrder(10_000, 1200)).toBe("GST (12%)");
  });

  it("degrades to a bare label rather than dividing by zero", () => {
    expect(gstLabelForOrder(0, 0)).toBe("GST");
  });
});
