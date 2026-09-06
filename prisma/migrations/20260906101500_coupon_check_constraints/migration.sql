-- Defence in depth for the coupon redemption counters.
--
-- Prisma does not model CHECK constraints, so these are added directly. The
-- application already enforces every one of these; the constraint is what
-- catches a future code path, a manual UPDATE, or a bad import that does not.

-- A redemption count can never be negative.
ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_timesUsed_nonneg" CHECK ("timesUsed" >= 0);

-- A cap of zero or less would make the coupon unusable rather than unlimited;
-- unlimited is expressed as NULL.
ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_maxRedemptions_positive"
  CHECK ("maxRedemptions" IS NULL OR "maxRedemptions" > 0);

ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_perUserLimit_positive"
  CHECK ("perUserLimit" IS NULL OR "perUserLimit" > 0);

-- The percentage/flat value must be positive; a negative coupon would ADD to
-- the charge.
ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_value_positive" CHECK ("value" > 0);

-- Orders: a discount is never negative and never exceeds the goods subtotal,
-- which is what lib/pricing.ts clamps to.
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_discount_within_subtotal"
  CHECK ("discountInr" >= 0 AND "discountInr" <= "subtotalInr");
