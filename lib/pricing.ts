export const GST_RATE = 0.05;
/** Display label derived from GST_RATE so the UI can never drift from the math. */
export const GST_LABEL = `GST (${Math.round(GST_RATE * 100)}%)`;
export const FREE_SHIPPING_THRESHOLD = 2000; // ₹
export const STANDARD_SHIPPING = 150;
export const EXPRESS_SHIPPING = 450;

export type ShippingMethod = "standard" | "express" | "pickup";

export function shippingCost(method: ShippingMethod, subtotalInr: number): number {
  if (method === "express") return EXPRESS_SHIPPING;
  if (method === "pickup") return 0;
  return subtotalInr >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
}

export type Totals = {
  subtotalInr: number;
  gstInr: number;
  shippingInr: number;
  discountInr: number;
  totalInr: number;
};

/** GST (5%) is charged on the goods subtotal; shipping is added after. */
export function computeTotals(
  subtotalInr: number,
  method: ShippingMethod = "standard",
  discountInr = 0,
): Totals {
  const gstInr = Math.round(subtotalInr * GST_RATE);
  const shippingInr = shippingCost(method, subtotalInr);
  const totalInr = Math.max(0, subtotalInr + gstInr + shippingInr - discountInr);
  return { subtotalInr, gstInr, shippingInr, discountInr, totalInr };
}
