import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

/**
 * Fixture helpers for integration tests.
 *
 * SAFETY: these tests run against the developer's own Postgres, which holds the
 * seeded demo catalogue. Nothing here truncates a table or deletes by broad
 * predicate — every fixture is created with a unique `TEST_TAG` prefix and only
 * rows carrying that prefix are ever removed. A failed test leaves its rows
 * behind rather than risking someone else's data.
 */

export const prisma = new PrismaClient();

/** Unique per process, so parallel runs and leftovers never collide. */
export const TEST_TAG = `vitest-${randomUUID().slice(0, 8)}`;

const tag = (s: string) => `${TEST_TAG}-${s}`;

export type SeededProduct = {
  productId: string;
  brandId: string;
  categoryId: string;
  inventoryId: string;
  slug: string;
};

/** A sellable product with an inventory row, priced in whole rupees. */
export async function createProduct(opts: {
  priceInr?: number;
  stock?: number;
  isActive?: boolean;
  name?: string;
} = {}): Promise<SeededProduct> {
  const slug = tag(`p-${randomUUID().slice(0, 8)}`);
  const brand = await prisma.brand.create({
    data: { name: tag("brand"), slug: tag(`brand-${randomUUID().slice(0, 6)}`) },
  });
  const category = await prisma.category.create({
    data: { name: tag("cat"), slug: tag(`cat-${randomUUID().slice(0, 6)}`) },
  });
  const product = await prisma.product.create({
    data: {
      name: opts.name ?? tag("Test Rifle"),
      slug,
      priceInr: opts.priceInr ?? 10_000,
      isActive: opts.isActive ?? true,
      brandId: brand.id,
      categoryId: category.id,
    },
  });
  const inventory = await prisma.inventoryItem.create({
    data: {
      productId: product.id,
      sku: tag(`sku-${randomUUID().slice(0, 8)}`),
      stock: opts.stock ?? 10,
    },
  });
  return {
    productId: product.id,
    brandId: brand.id,
    categoryId: category.id,
    inventoryId: inventory.id,
    slug,
  };
}

export async function createUser(opts: { loyaltyPoints?: number; role?: "CUSTOMER" | "ADMIN" | "STAFF" | "DEALER" } = {}) {
  return prisma.user.create({
    data: {
      email: `${tag(randomUUID().slice(0, 8))}@example.test`,
      name: tag("user"),
      loyaltyPoints: opts.loyaltyPoints ?? 0,
      role: opts.role ?? "CUSTOMER",
    },
  });
}

/** A PENDING order for `product`, ready to be settled. */
export async function createPendingOrder(opts: {
  userId?: string | null;
  productId: string;
  quantity?: number;
  unitPriceInr?: number;
}) {
  const quantity = opts.quantity ?? 1;
  const unitPriceInr = opts.unitPriceInr ?? 10_000;
  const total = quantity * unitPriceInr;
  return prisma.order.create({
    data: {
      number: tag(`ord-${randomUUID().slice(0, 8)}`),
      userId: opts.userId ?? null,
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotalInr: total,
      gstInr: 0,
      shippingInr: 0,
      totalInr: total,
      items: {
        create: [
          {
            productId: opts.productId,
            name: tag("line"),
            unitPriceInr,
            quantity,
          },
        ],
      },
    },
    select: { id: true, number: true, totalInr: true },
  });
}

/**
 * Remove every row this process created, in FK-safe order.
 *
 * Scoped strictly to the TEST_TAG prefix — a broad delete here would wipe the
 * developer's seeded catalogue.
 */
export async function cleanup(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: TEST_TAG } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  // Orders are matched two ways. Fixture orders carry the tag in their number,
  // but an order created by exercising `startCheckout` gets a real VSK-… number
  // — so also take anything belonging to a user this run created. Both
  // predicates stay scoped to this process's own rows.
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { number: { startsWith: TEST_TAG } },
        ...(userIds.length ? [{ userId: { in: userIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  const products = await prisma.product.findMany({
    where: { slug: { startsWith: TEST_TAG } },
    select: { id: true },
  });
  const productIds = products.map((p) => p.id);

  if (orderIds.length) {
    await prisma.returnItem.deleteMany({ where: { return: { orderId: { in: orderIds } } } });
    await prisma.return.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.emailLog.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }
  if (userIds.length) {
    await prisma.rewardRedemption.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.rewardLedger.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.review.deleteMany({ where: { userId: { in: userIds } } });
  }
  if (productIds.length) {
    await prisma.cartItem.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.review.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.inventoryItem.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.productVariant.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }
  if (userIds.length) {
    // Addresses cascade from User, but delete explicitly so the order is
    // deterministic regardless of referential action.
    await prisma.address.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.rewardItem.deleteMany({ where: { title: { startsWith: TEST_TAG } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: TEST_TAG } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: TEST_TAG } } });
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: TEST_TAG } } });
}
