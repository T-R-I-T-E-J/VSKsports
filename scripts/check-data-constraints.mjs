/**
 * Assert that existing rows satisfy the CHECK constraints the migrations add.
 *
 * A CHECK constraint is applied to the whole table, so a migration that adds
 * one fails partway if any existing row violates it. On a fresh CI database
 * that can never happen; against production it absolutely can, and the failure
 * arrives mid-deploy. Run this against production BEFORE deploying a migration
 * that introduces a constraint — see docs/RUNBOOK.md.
 *
 * Uses $queryRaw tagged templates: $queryRawUnsafe is banned by a custom lint
 * rule in this repo, and correctly so.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Each check names the constraint it protects, so a failure is actionable. */
const CHECKS = [
  {
    constraint: "Order_discount_within_subtotal",
    describe: "orders whose discount is negative or exceeds their subtotal",
    run: () => prisma.$queryRaw`
      SELECT count(*)::int AS n FROM "Order"
      WHERE "discountInr" < 0 OR "discountInr" > "subtotalInr"
    `,
  },
  {
    constraint: "Coupon_value_positive",
    describe: "coupons with a non-positive value",
    run: () => prisma.$queryRaw`SELECT count(*)::int AS n FROM "Coupon" WHERE "value" <= 0`,
  },
  {
    constraint: "Coupon_timesUsed_nonneg",
    describe: "coupons with a negative redemption count",
    run: () => prisma.$queryRaw`SELECT count(*)::int AS n FROM "Coupon" WHERE "timesUsed" < 0`,
  },
  {
    constraint: "Coupon_maxRedemptions_positive",
    describe: "coupons with a non-positive redemption cap (use NULL for unlimited)",
    run: () => prisma.$queryRaw`
      SELECT count(*)::int AS n FROM "Coupon"
      WHERE "maxRedemptions" IS NOT NULL AND "maxRedemptions" <= 0
    `,
  },
  {
    constraint: "Coupon_perUserLimit_positive",
    describe: "coupons with a non-positive per-customer limit (use NULL for unlimited)",
    run: () => prisma.$queryRaw`
      SELECT count(*)::int AS n FROM "Coupon"
      WHERE "perUserLimit" IS NOT NULL AND "perUserLimit" <= 0
    `,
  },
];

let violations = 0;

for (const check of CHECKS) {
  const rows = await check.run();
  const n = Number(rows[0]?.n ?? 0);
  if (n > 0) {
    violations += n;
    console.error(`FAIL ${check.constraint}: ${n} ${check.describe}`);
  } else {
    console.log(`ok   ${check.constraint}`);
  }
}

await prisma.$disconnect();

if (violations > 0) {
  console.error(
    `\n${violations} row(s) violate a CHECK constraint. ` +
      `Deploying the migration that adds it would fail partway. Fix the data first.`,
  );
  process.exit(1);
}

console.log("\nAll CHECK constraints are satisfiable against this database.");
