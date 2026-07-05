import { readFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

// load .env (DATABASE_URL) for this standalone script
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const prisma = new PrismaClient();

const SRC = "new_assets/product_image";
const OUT_DIR = path.join(process.cwd(), "public", "uploads", "products");
const f = (n) => `artekindia.com_wp-content_uploads_${n}`;

// 9 real products (prices are best-estimate INR — confirm/adjust in admin).
const PRODUCTS = [
  { slug: "walther-lg500-anatomic", name: "Walther LG500 Anatomic", brand: "walther", cat: "air-rifles",
    priceInr: 265000, mrpInr: null, badge: "vsk", caliber: ".177",
    short: "Flagship 10m match air rifle with the Anatomic stock — Walther's top-tier ISSF platform.",
    images: ["2025_11_2866161E_LG500_Anatomic_e.jpg.png", "2025_11_2866161M-LG500-Anatomic-M.jpg.png"] },
  { slug: "walther-lg400-anatomic", name: "Walther LG400 Anatomic", brand: "walther", cat: "air-rifles",
    priceInr: 210000, mrpInr: null, badge: null, caliber: ".177",
    short: "Proven LG400 match rifle with the adjustable Anatomic stock for precision 10m shooting.",
    images: ["2026_03_2758008_LG400-M_Anatomic.jpg.png"] },
  { slug: "walther-lg400-monotec", name: "Walther LG400 Monotec", brand: "walther", cat: "air-rifles",
    priceInr: 225000, mrpInr: 245000, badge: "sale", caliber: ".177",
    short: "LG400 with the carbon Monotec system — light, stiff, and tournament-ready.",
    images: ["2026_03_2838028m_LG400monotec_m.jpg.png"] },
  { slug: "morini-cm162ei-titanium", name: "Morini CM 162EI Titanium", brand: "morini", cat: "air-pistols",
    priceInr: 175000, mrpInr: null, badge: null, caliber: ".177",
    short: "Electronic-trigger 10m match air pistol with a titanium frame — a finals-grade Morini.",
    images: ["2025_02_morini162Ei-titanium.png.png"] },
  { slug: "pardini-k10", name: "Pardini K10 Air Pistol", brand: "pardini", cat: "air-pistols",
    priceInr: 130000, mrpInr: null, badge: null, caliber: ".177",
    short: "Pardini's compact-absorber 10m match air pistol — smooth recoil and a refined grip.",
    images: ["2025_02_K10-Pardini-Air-Pistol.jpg.png"] },
  { slug: "pardini-k12", name: "Pardini K12 Air Pistol", brand: "pardini", cat: "air-pistols",
    priceInr: 145000, mrpInr: null, badge: null, caliber: ".177",
    short: "The evolved K12 with improved absorber and balance for elite-level 10m air pistol.",
    images: ["2025_02_K12-Pardini-Air-Pistol.jpg.png"] },
  { slug: "steyr-lp2-compact", name: "Steyr LP2 Compact", brand: "steyr", cat: "air-pistols",
    priceInr: 155000, mrpInr: null, badge: null, caliber: ".177",
    short: "Steyr precision 10m match air pistol — verify exact model (LP2/LP10) and price in admin.",
    images: ["2025_02_Steyr-LP-2.jpg.png"] },
  { slug: "rws-r10-match-pistol-pellets", name: "RWS R10 Match Pistol Pellets (.177, 7.0gr, 500)", brand: "rws", cat: "pellets",
    priceInr: 2400, mrpInr: null, badge: null, caliber: ".177",
    short: "RWS R10 Match wadcutter pistol pellets — 4.50mm, 7.0 grains, tin of 500.",
    images: ["2025_02_RWS-R10-Pistol-4.50MM-.177-Cal-7.0-Grains-Wadcutter-500-Pellets-1400x1400-1.jpg.png"] },
  { slug: "rws-r10-match-pellets", name: "RWS R10 Match Pellets (.177, 500)", brand: "rws", cat: "pellets",
    priceInr: 2800, mrpInr: null, badge: null, caliber: ".177",
    short: "RWS R10 Match competition pellets — tin of 500. Confirm exact variant/grain in admin.",
    images: ["2025_02_487a4272-copy-500x500-1.jpg.png"] },
];

async function brandId(slug, name) {
  const b = await prisma.brand.upsert({ where: { slug }, update: {}, create: { slug, name } });
  return b.id;
}
async function categoryId(slug) {
  const c = await prisma.category.findUnique({ where: { slug } });
  return c?.id ?? null;
}

async function cleanImage(srcFile, outName) {
  const src = await fs.readFile(path.join(SRC, srcFile));
  let pipe = sharp(src).rotate();
  try { pipe = pipe.trim({ threshold: 12 }); } catch { /* skip trim if uniform */ }
  const buf = await pipe
    .flatten({ background: "#ffffff" })
    .resize(1000, 1000, { fit: "contain", background: "#ffffff" })
    .webp({ quality: 88 })
    .toBuffer();
  const meta = await sharp(buf).metadata();
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, outName), buf);
  return { buf, width: meta.width, height: meta.height };
}

async function main() {
  await brandId("rws", "RWS");
  const realSlugs = [];

  for (const p of PRODUCTS) {
    realSlugs.push(p.slug);
    const bId = await brandId(p.brand, p.brand.toUpperCase());
    const cId = await categoryId(p.cat);

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name, brandId: bId, categoryId: cId, priceInr: p.priceInr, mrpInr: p.mrpInr,
        badge: p.badge, caliber: p.caliber, shortDescription: p.short, description: p.short, isActive: true,
      },
      create: {
        slug: p.slug, name: p.name, brandId: bId, categoryId: cId, priceInr: p.priceInr, mrpInr: p.mrpInr,
        badge: p.badge, caliber: p.caliber, shortDescription: p.short, description: p.short, isActive: true,
        tags: ["10M", "MATCH"],
      },
    });

    // stock
    const sku = p.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 28);
    await prisma.inventoryItem.upsert({
      where: { productId: product.id },
      update: { stock: 6 },
      create: { productId: product.id, sku, stock: 6, reorderPoint: 2 },
    });

    // reset images for a clean re-import
    const old = await prisma.productImage.findMany({ where: { productId: product.id }, select: { fileId: true } });
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.file.deleteMany({ where: { id: { in: old.map((o) => o.fileId).filter(Boolean) } } });

    let pos = 0;
    for (const srcFile of p.images) {
      const outName = `${p.slug}-${pos}.webp`;
      const { buf, width, height } = await cleanImage(f(srcFile), outName);
      const key = `products/${outName}`;
      const url = `/uploads/${key}`;
      const file = await prisma.file.create({
        data: {
          key, url, mime: "image/webp", sizeBytes: buf.length, width, height,
          kind: "PRODUCT_IMAGE", visibility: "PUBLIC", status: "ATTACHED", sanitized: true, scanStatus: "clean",
        },
      });
      await prisma.productImage.create({
        data: { productId: product.id, fileId: file.id, url, alt: p.name, position: pos },
      });
      pos++;
    }
    console.log(`✓ ${p.name} (${pos} image${pos === 1 ? "" : "s"})`);
  }

  // Deactivate the demo catalog (reversible — isActive=false, not deleted).
  const deact = await prisma.product.updateMany({
    where: { slug: { notIn: realSlugs } }, data: { isActive: false },
  });
  console.log(`\nDeactivated ${deact.count} demo products. Real catalog now: ${realSlugs.length} products active.`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
