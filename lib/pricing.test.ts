import { describe, expect, it } from "vitest";
import { GST_RATE, GST_LABEL, computeTotals } from "./pricing";

// Regression guard: this is the second time a stray hardcoded 18% drifted from
// the real rate. Pin the rate, the derived label, and the totals formula so a
// silent rate change can never ship green again.
describe("pricing — GST", () => {
  it("GST_RATE is pinned at 5%", () => {
    expect(GST_RATE).toBe(0.05);
  });

  it("GST_LABEL is derived from GST_RATE (never hardcoded)", () => {
    expect(GST_LABEL).toBe("GST (5%)");
  });

  it("charges 5% GST on the subtotal; pickup has no shipping", () => {
    const t = computeTotals(10000, "pickup");
    expect(t.gstInr).toBe(500); // round(10000 * 0.05)
    expect(t.totalInr).toBe(10500); // 10000 + 500 + 0 shipping - 0 discount
  });

  it("adds flat shipping below the free-shipping threshold", () => {
    const t = computeTotals(1000, "standard");
    expect(t.gstInr).toBe(50);
    expect(t.shippingInr).toBe(150);
    expect(t.totalInr).toBe(1200); // 1000 + 50 + 150
  });

  it("gives free standard shipping at/above the threshold", () => {
    const t = computeTotals(2000, "standard");
    expect(t.shippingInr).toBe(0);
    expect(t.totalInr).toBe(2100); // 2000 + 100 + 0
  });

  it("subtracts discount and never goes negative", () => {
    const t = computeTotals(1000, "pickup", 5000);
    expect(t.totalInr).toBe(0);
  });
});
