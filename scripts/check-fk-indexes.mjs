// Fails when any foreign key column lacks a leading index.
//
// Postgres does not index foreign keys automatically and Prisma does not add
// them, so this gap is silent and easy to reintroduce: 42 hot-path columns
// (Order.userId, OrderItem.orderId, Review.productId and others) were full
// sequential scans. Run in CI so a new relation cannot land without its index.
//
// Usage: node scripts/check-fk-indexes.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  // Tagged template (not $queryRawUnsafe): the query is static, and the
  // project bans the unsafe variant outright.
  const rows = await prisma.$queryRaw`
    SELECT c.conrelid::regclass::text AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]
      )
    ORDER BY 1, 2
  `;

  if (rows.length > 0) {
    console.error(`\n${rows.length} foreign key column(s) have no index:\n`);
    for (const r of rows) console.error(`  ${r.tbl}.${r.col}`);
    console.error(
      "\nAdd @@index([<column>]) to the model in prisma/schema.prisma and create a migration.\n",
    );
    process.exitCode = 1;
  } else {
    console.log("All foreign keys are indexed.");
  }
} finally {
  await prisma.$disconnect();
}
