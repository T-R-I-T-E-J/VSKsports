/** ₹ with Indian digit grouping, e.g. 184500 -> "₹1,84,500". */
export const formatINR = (n: number): string =>
  "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

/** Star string from a 0–5 rating, e.g. 4.6 -> "★★★★★". */
export const stars = (rating?: number | null): string => {
  const full = Math.max(0, Math.min(5, Math.round(rating ?? 0)));
  return "★".repeat(full) + "☆".repeat(5 - full);
};
