import {
  PrismaClient,
  Role,
  CustomerType,
  OrderStatus,
  PaymentStatus,
  NotificationType,
  TrainingLevel,
  ReviewStatus,
  CouponType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import data from "./seed-data.json";
import { DEFAULT_PRICING } from "../lib/pricing";

const prisma = new PrismaClient();
// Rows come from a prototype JSON export whose tables have genuinely different
// shapes — some call sites destructure a row as a tuple, others read named
// properties off it. Narrowing to `unknown` forces a cast at every one of ~40
// call sites for no safety gain in a seed script, so `any` is deliberate and
// scoped to these two lines.
/* eslint-disable @typescript-eslint/no-explicit-any */
const DB = data as unknown as Record<string, any[]>;
const get = (k: string): any[] => (Array.isArray(DB[k]) ? DB[k] : []);
/* eslint-enable @typescript-eslint/no-explicit-any */

const parsePrice = (s?: string | null): number => {
  if (!s) return 0;
  const n = parseInt(String(s).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};
const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const categoryFor = (name: string, tags: string[] = []): string => {
  const s = (name + " " + tags.join(" ")).toLowerCase();
  if (s.includes("pistol")) return "air-pistols";
  if (s.includes("pellet")) return "pellets";
  if (s.includes("target")) return "targets";
  if (/glove|jacket|case|scope|stand|sling|cleaning|kit|bag/.test(s)) return "accessories";
  // remaining items are rifles & sporters (PCP / spring / gas-piston long guns)
  return "air-rifles";
};

const CATEGORIES: [string, string][] = [
  ["air-rifles", "Air Rifles"],
  ["air-pistols", "Air Pistols"],
  ["targets", "Targets"],
  ["pellets", "Pellets"],
  ["accessories", "Accessories"],
  ["vsk", "VSK Products"],
];

/**
 * DESTRUCTIVE. `clear()` empties every table before reseeding, so running this
 * against a production database would delete real orders, customers and
 * payments. Guarded on two independent signals — NODE_ENV and the host in
 * DATABASE_URL — because a seed run is usually a local muscle-memory command
 * typed with the wrong shell env loaded.
 *
 * Override deliberately with ALLOW_DESTRUCTIVE_SEED=yes if you really do mean
 * to wipe a remote database.
 */
function assertNotProduction() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED === "yes") return;

  const url = process.env.DATABASE_URL ?? "";
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "db";

  if (process.env.NODE_ENV === "production" || !isLocal) {
    throw new Error(
      `Refusing to seed: this wipes every table and the target database is not local ` +
        `(NODE_ENV=${process.env.NODE_ENV ?? "unset"}, host=${host || "unparseable"}). ` +
        `Set ALLOW_DESTRUCTIVE_SEED=yes only if you intend to erase it.`,
    );
  }
}

async function clear() {
  assertNotProduction();
  await prisma.translation.deleteMany();
  await prisma.staffAction.deleteMany();
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.returnItem.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.rewardRedemption.deleteMany();
  await prisma.rewardItem.deleteMany();
  await prisma.customerNote.deleteMany();
  await prisma.dealerProfile.deleteMany();
  await prisma.trainingRegistration.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.rewardLedger.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.return.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.dealerApplication.deleteMany();
  await prisma.dealer.deleteMany();
  await prisma.event.deleteMany();
  await prisma.trainingBatch.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.address.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await clear();
  // Seed password: dev convenience default, but NEVER ship the known default to
  // production. Set SEED_PASSWORD to a strong value before seeding prod.
  const seedPassword = process.env.SEED_PASSWORD ?? "vsksports";
  if (process.env.NODE_ENV === "production" && !process.env.SEED_PASSWORD) {
    throw new Error(
      "Refusing to seed production with the default password. Set SEED_PASSWORD to a strong value first.",
    );
  }
  const pw = await bcrypt.hash(seedPassword, 10);

  // ---- Categories ----
  const catBySlug = new Map<string, string>();
  for (const [slug, name] of CATEGORIES) {
    const c = await prisma.category.create({ data: { slug, name } });
    catBySlug.set(slug, c.id);
  }

  // ---- Brands ----
  const brandByName = new Map<string, string>();
  for (const b of get("Brands.html::BRANDS")) {
    const created = await prisma.brand.create({
      data: {
        slug: slugify(b.n),
        name: b.n,
        country: b.c ?? null,
        color: b.col ?? null,
        description: b.p ?? null,
      },
    });
    brandByName.set(String(b.n).toLowerCase(), created.id);
  }
  const ensureBrand = async (name?: string): Promise<string | null> => {
    if (!name) return null;
    const key = name.toLowerCase();
    const existing = brandByName.get(key);
    if (existing) return existing;
    const created = await prisma.brand.create({ data: { slug: slugify(name), name } });
    brandByName.set(key, created.id);
    return created.id;
  };

  // ---- Products (+ inventory, variants) ----
  const productByName = new Map<string, { id: string; priceInr: number; name: string }>();
  const products = get("Shop.html::PRODUCTS");
  let pi = 0;
  for (const p of products) {
    const tags: string[] = Array.isArray(p.t) ? p.t : [];
    const brandId = await ensureBrand(p.b);
    const slug = slugify(`${p.b ?? ""} ${p.n}`) || `product-${pi}`;
    const priceInr = parsePrice(p.price);
    const product = await prisma.product.create({
      data: {
        slug,
        name: p.n,
        brandId,
        categoryId: catBySlug.get(categoryFor(p.n, tags)) ?? null,
        caliber: p.cal ?? null,
        tags,
        badge: p.tag ?? null,
        priceInr,
        mrpInr: p.was ? parsePrice(p.was) : null,
        dealerPriceInr: Math.round(priceInr * 0.7), // wholesale ≈ 30% margin

        rating: p.r ? parseFloat(p.r) : null,
        reviewCount: typeof p.rev === "number" ? p.rev : 0,
        inventory: {
          create: {
            sku: `SKU-${String(p.b ?? "VSK").slice(0, 3).toUpperCase()}-${100 + pi}`,
            stock: 5 + ((pi * 7) % 40),
            reserved: pi % 4,
            reorderPoint: 5,
          },
        },
      },
    });
    productByName.set(String(p.n).toLowerCase(), { id: product.id, priceInr, name: p.n });
    pi++;
  }

  // a couple of variants on the first product
  const first = products[0];
  const firstProduct = first ? productByName.get(String(first.n).toLowerCase()) : null;
  if (firstProduct) {
    await prisma.productVariant.createMany({
      data: [
        { productId: firstProduct.id, sku: `VAR-${firstProduct.id.slice(0, 6)}-A`, label: ".177 · Aluminium", priceInr: firstProduct.priceInr, stock: 6 },
        { productId: firstProduct.id, sku: `VAR-${firstProduct.id.slice(0, 6)}-B`, label: ".177 · Walnut", priceInr: firstProduct.priceInr + 12000, stock: 3 },
      ],
    });
  }

  const findProduct = (name: string) => {
    const key = name.toLowerCase();
    const exact = productByName.get(key);
    if (exact) return exact;
    for (const [k, v] of productByName) if (k.includes(key) || key.includes(k)) return v;
    return null;
  };

  // ---- Users (CRM customers) + admin + dealer ----
  const userByName = new Map<string, string>();
  for (const row of get("Admin-Customers.html::C")) {
    const [name, , email, , type, location, orders] = row;
    if (!email) continue;
    const u = await prisma.user.create({
      data: {
        name,
        email: String(email).toLowerCase(),
        passwordHash: pw,
        role: Role.CUSTOMER,
        customerType: String(type).toLowerCase().includes("academy")
          ? CustomerType.ACADEMY
          : CustomerType.INDIVIDUAL,
        location: location ?? null,
        loyaltyPoints: (typeof orders === "number" ? orders : 0) * 50,
      },
    });
    userByName.set(String(name).toLowerCase(), u.id);
  }
  const admin = await prisma.user.create({
    data: { name: "V. Kumar", email: "admin@vsksports.in", passwordHash: pw, role: Role.ADMIN },
  });
  await prisma.user.create({
    data: {
      name: "Bull's-Eye Sports",
      email: "dealer@vsksports.in",
      passwordHash: pw,
      role: Role.DEALER,
      customerType: CustomerType.DEALER,
    },
  });
  const primaryCustomerId: string = userByName.values().next().value ?? admin.id;
  await prisma.user.update({ where: { id: primaryCustomerId }, data: { loyaltyTier: "GOLD" } });

  // ---- Addresses (demo customer) ----
  await prisma.address.createMany({
    data: [
      { userId: primaryCustomerId, name: "Aarav Deshmukh", phone: "+91 98765 43210", line1: "22 Shanti Nagar", city: "Nagpur", state: "Maharashtra", pincode: "440010", isDefault: true },
      { userId: primaryCustomerId, name: "Office", phone: "+91 98765 43210", line1: "5th Flr, Tech Park", city: "Nagpur", state: "Maharashtra", pincode: "440022", isDefault: false },
    ],
  });

  // ---- Orders (+ one item each) ----
  const mapPay = (s: string): PaymentStatus =>
    /paid/i.test(s) ? PaymentStatus.PAID
      : /refund/i.test(s) ? PaymentStatus.REFUNDED
      : /fail/i.test(s) ? PaymentStatus.FAILED
      : PaymentStatus.PENDING;
  const mapStatus = (s: string): OrderStatus => {
    const x = s.toLowerCase();
    if (x.includes("out for")) return OrderStatus.OUT_FOR_DELIVERY;
    if (x.includes("deliver")) return OrderStatus.DELIVERED;
    if (x.includes("ship")) return OrderStatus.SHIPPED;
    if (x.includes("process")) return OrderStatus.PROCESSING;
    if (x.includes("cancel")) return OrderStatus.CANCELLED;
    if (x.includes("return")) return OrderStatus.RETURNED;
    if (x.includes("paid")) return OrderStatus.PAID;
    return OrderStatus.PENDING;
  };
  let oi = 0;
  for (const row of get("Admin-Orders.html::O")) {
    const [num, dateStr, customer, , , payStatus, , fulfillStatus, total] = row;
    const totalInr = parsePrice(total);
    // Forward-derive a correct GST split of the historical total so seeded
    // orders match the live rate (was /1.18, which baked in the old 18%).
    const subtotalInr = Math.round(totalInr / (1 + DEFAULT_PRICING.gstRate));
    const gstInr = totalInr - subtotalInr;
    const prod = products[oi % Math.max(products.length, 1)];
    const created = new Date(dateStr);
    await prisma.order.create({
      data: {
        number: String(num).replace(/^#/, ""),
        userId: userByName.get(String(customer).toLowerCase()) ?? null,
        status: mapStatus(String(fulfillStatus)),
        paymentStatus: mapPay(String(payStatus)),
        subtotalInr,
        gstInr,
        totalInr,
        createdAt: isNaN(created.getTime()) ? undefined : created,
        items: { create: [{ name: prod?.n ?? "VSK item", unitPriceInr: subtotalInr, quantity: 1 }] },
      },
    });
    oi++;
  }

  // ---- Dealers directory ----
  for (const d of get("Dealers.html::DEALERS")) {
    await prisma.dealer.create({ data: { name: d.n, city: d.c ?? null } });
  }

  // ---- Events ----
  for (const e of get("Events.html::EVENTS")) {
    await prisma.event.create({
      data: {
        slug: slugify(e.t),
        title: e.t,
        date: e.date ?? "",
        location: e.loc ?? null,
        category: e.cat ?? null,
        status: String(e.status).toLowerCase() === "live" ? "LIVE" : "UPCOMING",
        imageNote: e.img ?? null,
      },
    });
  }

  // ---- Training batches ----
  const mapLevel = (s?: string): TrainingLevel => {
    const x = (s ?? "").toLowerCase();
    if (x.includes("adv")) return TrainingLevel.ADVANCED;
    if (x.includes("inter")) return TrainingLevel.INTERMEDIATE;
    return TrainingLevel.BEGINNER;
  };
  for (const b of get("Training.html::BATCHES")) {
    await prisma.trainingBatch.create({
      data: {
        slug: slugify(b.t),
        title: b.t,
        date: b.date ?? "",
        location: b.loc ?? null,
        duration: b.dur ?? null,
        level: mapLevel(b.level),
        priceInr: b.price ? parsePrice(b.price) : null,
        spotsNote: b.spots ?? null,
        imageNote: b.img ?? null,
      },
    });
  }

  // ---- Blog (dedupe by slug across POSTS + MORE) ----
  const blogSeen = new Set<string>();
  for (const post of [...get("Blog.html::POSTS"), ...get("Article.html::MORE")]) {
    const slug = slugify(post.t);
    if (!slug || blogSeen.has(slug)) continue;
    blogSeen.add(slug);
    await prisma.blogPost.create({
      data: {
        slug,
        title: post.t,
        category: post.cat ?? null,
        excerpt: post.ex ?? null,
        readTime: post.read ?? null,
        publishedAt: post.date ?? null,
      },
    });
  }

  // ---- Coupons ----
  await prisma.coupon.createMany({
    data: [
      { code: "WELCOME10", type: CouponType.PERCENT, value: 10, minOrderInr: 200000 },
      { code: "RANGE500", type: CouponType.FLAT, value: 500, minOrderInr: 200000 },
      { code: "ACADEMY15", type: CouponType.PERCENT, value: 15, minOrderInr: 1000000 },
    ],
  });

  // ---- Reviews (approved, on first products) ----
  const reviewSeed = [
    { rating: 5, title: "Match-grade accuracy", body: "Dead-on out of the box. The trigger is sublime." },
    { rating: 5, title: "Worth every rupee", body: "Competition-ready. VSK delivery was quick and insured." },
    { rating: 4, title: "Excellent rifle", body: "Slightly heavy for juniors but superb consistency." },
  ];
  for (let i = 0; i < reviewSeed.length; i++) {
    const prod = products[i];
    const fp = prod ? findProduct(prod.n) : null;
    if (!fp) continue;
    await prisma.review.create({
      data: {
        productId: fp.id,
        userId: primaryCustomerId,
        authorName: "Verified buyer",
        rating: reviewSeed[i].rating,
        title: reviewSeed[i].title,
        body: reviewSeed[i].body,
        status: ReviewStatus.APPROVED,
      },
    });
  }

  // ---- Notifications (primary customer) ----
  const mapNotif = (t: string): NotificationType => {
    const x = (t ?? "").toLowerCase();
    if (x.includes("order")) return NotificationType.ORDER;
    if (x.includes("reward")) return NotificationType.REWARD;
    if (x.includes("promo")) return NotificationType.PROMO;
    if (x.includes("review")) return NotificationType.REVIEW;
    return NotificationType.SYSTEM;
  };
  for (const row of get("Notifications.html::N")) {
    const [type, title, body, , read] = row;
    await prisma.notification.create({
      data: {
        userId: primaryCustomerId,
        type: mapNotif(type),
        title: title ?? "Notification",
        body: body ?? null,
        read: Boolean(read),
      },
    });
  }

  // ---- Reward ledger ----
  await prisma.rewardLedger.createMany({
    data: [
      { userId: primaryCustomerId, points: 50, reason: "Review reward — Walther LG400" },
      { userId: primaryCustomerId, points: 220, reason: "Order VSK-2026-0417" },
      { userId: primaryCustomerId, points: -500, reason: "Redeemed ₹500 voucher" },
    ],
  });

  // ---- Cart + wishlist (primary customer) ----
  const cart = await prisma.cart.create({ data: { token: `seed-${primaryCustomerId}`, userId: primaryCustomerId } });
  for (const c of get("Cart.html::CART")) {
    const fp = findProduct(c.n);
    if (!fp) continue;
    await prisma.cartItem
      .create({ data: { cartId: cart.id, productId: fp.id, variantLabel: c.meta ?? null, quantity: 1 } })
      .catch(() => {});
  }
  for (const w of get("Account.html::WISH")) {
    const fp = findProduct(w.n);
    if (!fp) continue;
    await prisma.wishlistItem
      .create({ data: { userId: primaryCustomerId, productId: fp.id } })
      .catch(() => {});
  }

  // ---- Phase 3–5 demo data (accounts / CRM / dealer / rewards / content) ----
  await prisma.rewardItem.createMany({
    data: [
      { title: "₹500 Off Voucher", description: "Apply to any order over ₹2,000", pointsCost: 500 },
      { title: "Free RWS Pellet Tin", description: "R10 Match .177 (500)", pointsCost: 800 },
      { title: "₹1,500 Off Voucher", description: "On orders over ₹10,000", pointsCost: 1500 },
      { title: "VSK Range Bag", description: "Branded hardshell gear bag", pointsCost: 2000 },
    ],
  });
  await prisma.rewardRedemption.create({
    data: { userId: primaryCustomerId, title: "₹500 Off Voucher", pointsSpent: 500, status: "FULFILLED" },
  });

  const dealerUser = await prisma.user.findUnique({ where: { email: "dealer@vsksports.in" } });
  if (dealerUser) {
    await prisma.dealerProfile.create({
      data: {
        userId: dealerUser.id,
        businessName: "Bull's-Eye Sports",
        gstNumber: "27ABCDE1234F1Z5",
        territory: "Maharashtra",
        marginPct: 32,
        tier: "GOLD",
        creditLimitInr: 500000,
        approvedAt: new Date(),
      },
    });
  }

  const firstOrder = await prisma.order.findFirst({
    where: { userId: primaryCustomerId },
    include: { items: true },
  });
  if (firstOrder) {
    const ret = await prisma.return.create({
      data: {
        rmaNumber: "RMA-2026-0001",
        orderId: firstOrder.id,
        userId: primaryCustomerId,
        reason: "Wrong item received",
        comment: "Received .22 instead of .177",
        status: "APPROVED",
        refundInr: firstOrder.totalInr,
      },
    });
    if (firstOrder.items[0]) {
      await prisma.returnItem.create({
        data: { returnId: ret.id, orderItemId: firstOrder.items[0].id, name: firstOrder.items[0].name, quantity: 1 },
      });
    }
    await prisma.orderEvent.createMany({
      data: [
        { orderId: firstOrder.id, status: "PAID", note: "Payment received" },
        { orderId: firstOrder.id, status: "PROCESSING", note: "Order packed" },
        { orderId: firstOrder.id, status: "SHIPPED", note: "Handed to courier" },
      ],
    });
  }

  const batch = await prisma.trainingBatch.findFirst();
  if (batch) {
    await prisma.trainingRegistration.create({
      data: { batchId: batch.id, userId: primaryCustomerId, name: "Aarav Deshmukh", phone: "+91 98765 43210", email: "aarav.d@email.com", experience: "Beginner", status: "CONFIRMED" },
    });
  }
  const ev = await prisma.event.findFirst();
  if (ev) {
    await prisma.eventRegistration.create({
      data: { eventId: ev.id, userId: primaryCustomerId, name: "Aarav Deshmukh", phone: "+91 98765 43210", category: "Men · Senior", discipline: "Air Rifle", status: "CONFIRMED" },
    });
  }

  await prisma.customerNote.create({
    data: { userId: primaryCustomerId, authorId: admin.id, body: "VIP customer — prefers WhatsApp. Interested in club rifles and academy pricing." },
  });

  // a couple of PENDING reviews for the admin moderation queue
  const pendingProducts = await prisma.product.findMany({ take: 2, orderBy: { reviewCount: "asc" } });
  for (const pp of pendingProducts) {
    await prisma.review.create({
      data: { productId: pp.id, userId: primaryCustomerId, authorName: "Aarav D.", rating: 4, title: "Awaiting moderation", body: "Solid rifle — review pending approval.", status: "PENDING" },
    });
  }

  // ---- Wave 0: audit log, inventory adjustments, i18n ----
  await prisma.staffAction.createMany({
    data: [
      { staffId: admin.id, action: "ORDER_STATUS_UPDATED", entity: "Order", entityId: firstOrder?.id ?? null, detail: "PROCESSING → SHIPPED" },
      { staffId: admin.id, action: "REVIEW_APPROVED", entity: "Review", detail: "Approved 3 product reviews" },
    ],
  });
  const inv = await prisma.inventoryItem.findFirst();
  if (inv) {
    await prisma.inventoryAdjustment.create({
      data: { inventoryItemId: inv.id, delta: 10, reason: "Stock received — June shipment", staffId: admin.id },
    });
    await prisma.inventoryItem.update({ where: { id: inv.id }, data: { stock: { increment: 10 } } });
  }
  await prisma.translation.createMany({
    data: [
      { locale: "en", key: "nav.shop", value: "Shop" },
      { locale: "hi", key: "nav.shop", value: "दुकान" },
      { locale: "en", key: "nav.brands", value: "Brands" },
      { locale: "hi", key: "nav.brands", value: "ब्रांड्स" },
      { locale: "en", key: "cta.shopNow", value: "Shop Now" },
      { locale: "hi", key: "cta.shopNow", value: "अभी खरीदें" },
      { locale: "en", key: "cart.title", value: "Your Cart" },
      { locale: "hi", key: "cart.title", value: "आपकी कार्ट" },
    ],
  });

  const [pc, uc, oc, bc] = await Promise.all([
    prisma.product.count(),
    prisma.user.count(),
    prisma.order.count(),
    prisma.brand.count(),
  ]);
  // SECURITY: never echo an operator-supplied SEED_PASSWORD — seed output lands
  // in CI/deployment logs. Only the well-known dev default is safe to print.
  const credentialNote = process.env.SEED_PASSWORD
    ? "Login password: the SEED_PASSWORD you supplied (admin@vsksports.in)."
    : `Dev login password: "${seedPassword}" (admin@vsksports.in).`;
  console.log(
    `Seed complete → ${bc} brands, ${pc} products, ${uc} users, ${oc} orders. ${credentialNote}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
