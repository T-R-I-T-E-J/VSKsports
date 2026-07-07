// Non-destructive catalog seeder for PRODUCTION.
// Upserts categories, brands, products (+inventory), events, training batches,
// blog posts and coupons from prisma/seed-data.json. Never calls clear(), never
// touches users / orders / carts. Idempotent — safe to re-run.
//
// Run:  DATABASE_URL="<prod url>" node scripts/seed-prod-catalog.mjs
import { PrismaClient } from "@prisma/client";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const data = require("../prisma/seed-data.json");

const prisma = new PrismaClient();
const get = (k) => (Array.isArray(data[k]) ? data[k] : []);
const parsePrice = (s) => {
  if (!s) return 0;
  const n = parseInt(String(s).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};
const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const categoryFor = (name, tags = []) => {
  const s = (name + " " + tags.join(" ")).toLowerCase();
  if (s.includes("pistol")) return "air-pistols";
  if (s.includes("pellet")) return "pellets";
  if (s.includes("target")) return "targets";
  if (/glove|jacket|case|scope|stand|sling|cleaning|kit|bag/.test(s)) return "accessories";
  return "air-rifles";
};
const CATEGORIES = [
  ["air-rifles", "Air Rifles"],
  ["air-pistols", "Air Pistols"],
  ["targets", "Targets"],
  ["pellets", "Pellets"],
  ["accessories", "Accessories"],
  ["vsk", "VSK Products"],
];

async function main() {
  const counts = { categories: 0, brands: 0, products: 0, events: 0, training: 0, blog: 0, coupons: 0 };

  // Categories
  const catBySlug = new Map();
  for (const [slug, name] of CATEGORIES) {
    const c = await prisma.category.upsert({ where: { slug }, update: { name }, create: { slug, name } });
    catBySlug.set(slug, c.id);
    counts.categories++;
  }

  // Brands
  const brandBySlug = new Map();
  const ensureBrand = async (name) => {
    if (!name) return null;
    const slug = slugify(name);
    if (brandBySlug.has(slug)) return brandBySlug.get(slug);
    const b = await prisma.brand.upsert({ where: { slug }, update: {}, create: { slug, name } });
    brandBySlug.set(slug, b.id);
    return b.id;
  };
  for (const b of get("Brands.html::BRANDS")) {
    const slug = slugify(b.n);
    const created = await prisma.brand.upsert({
      where: { slug },
      update: { name: b.n, country: b.c ?? null, color: b.col ?? null, description: b.p ?? null },
      create: { slug, name: b.n, country: b.c ?? null, color: b.col ?? null, description: b.p ?? null },
    });
    brandBySlug.set(slug, created.id);
    counts.brands++;
  }

  // Products (+ inventory)
  const products = get("Shop.html::PRODUCTS");
  let pi = 0;
  for (const p of products) {
    const tags = Array.isArray(p.t) ? p.t : [];
    const brandId = await ensureBrand(p.b);
    const slug = slugify(`${p.b ?? ""} ${p.n}`) || `product-${pi}`;
    const priceInr = parsePrice(p.price);
    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name: p.n,
        brandId,
        categoryId: catBySlug.get(categoryFor(p.n, tags)) ?? null,
        caliber: p.cal ?? null,
        tags,
        badge: p.tag ?? null,
        priceInr,
        mrpInr: p.was ? parsePrice(p.was) : null,
        dealerPriceInr: Math.round(priceInr * 0.7),
        rating: p.r ? parseFloat(p.r) : null,
        reviewCount: typeof p.rev === "number" ? p.rev : 0,
      },
      create: {
        slug,
        name: p.n,
        brandId,
        categoryId: catBySlug.get(categoryFor(p.n, tags)) ?? null,
        caliber: p.cal ?? null,
        tags,
        badge: p.tag ?? null,
        priceInr,
        mrpInr: p.was ? parsePrice(p.was) : null,
        dealerPriceInr: Math.round(priceInr * 0.7),
        rating: p.r ? parseFloat(p.r) : null,
        reviewCount: typeof p.rev === "number" ? p.rev : 0,
      },
    });
    // inventory: create only if missing (keeps existing stock on re-run)
    const inv = await prisma.inventoryItem.findFirst({ where: { productId: product.id } });
    if (!inv) {
      await prisma.inventoryItem.create({
        data: {
          productId: product.id,
          sku: `SKU-${String(p.b ?? "VSK").slice(0, 3).toUpperCase()}-${100 + pi}`,
          stock: 5 + ((pi * 7) % 40),
          reserved: pi % 4,
          reorderPoint: 5,
        },
      });
    }
    counts.products++;
    pi++;
  }

  // Events
  for (const e of get("Events.html::EVENTS")) {
    const slug = slugify(e.t);
    const payload = {
      title: e.t,
      date: e.date ?? "",
      location: e.loc ?? null,
      category: e.cat ?? null,
      status: String(e.status).toLowerCase() === "live" ? "LIVE" : "UPCOMING",
      imageNote: e.img ?? null,
    };
    await prisma.event.upsert({ where: { slug }, update: payload, create: { slug, ...payload } });
    counts.events++;
  }

  // Training batches
  const mapLevel = (s) => {
    const x = (s ?? "").toLowerCase();
    if (x.includes("adv")) return "ADVANCED";
    if (x.includes("inter")) return "INTERMEDIATE";
    return "BEGINNER";
  };
  for (const b of get("Training.html::BATCHES")) {
    const slug = slugify(b.t);
    const payload = {
      title: b.t,
      date: b.date ?? "",
      location: b.loc ?? null,
      duration: b.dur ?? null,
      level: mapLevel(b.level),
      priceInr: b.price ? parsePrice(b.price) : null,
      spotsNote: b.spots ?? null,
      imageNote: b.img ?? null,
    };
    await prisma.trainingBatch.upsert({ where: { slug }, update: payload, create: { slug, ...payload } });
    counts.training++;
  }

  // Blog
  const blogSeen = new Set();
  for (const post of [...get("Blog.html::POSTS"), ...get("Article.html::MORE")]) {
    const slug = slugify(post.t);
    if (!slug || blogSeen.has(slug)) continue;
    blogSeen.add(slug);
    const payload = {
      title: post.t,
      category: post.cat ?? null,
      excerpt: post.ex ?? null,
      readTime: post.read ?? null,
      publishedAt: post.date ?? null,
    };
    await prisma.blogPost.upsert({ where: { slug }, update: payload, create: { slug, ...payload } });
    counts.blog++;
  }

  // Coupons
  for (const c of [
    { code: "WELCOME10", type: "PERCENT", value: 10, minOrderInr: 200000 },
    { code: "RANGE500", type: "FLAT", value: 500, minOrderInr: 200000 },
    { code: "ACADEMY15", type: "PERCENT", value: 15, minOrderInr: 1000000 },
  ]) {
    await prisma.coupon.upsert({ where: { code: c.code }, update: c, create: c });
    counts.coupons++;
  }

  console.log("CATALOG SEEDED (upsert):", JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error("SEED ERROR:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
