import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/storefront/PageHeader";
import { ProductCard } from "@/components/commerce/ProductCard";
import { SortSelect } from "@/components/storefront/SortSelect";
import { ViewToggle } from "@/components/storefront/ViewToggle";

export const metadata = { title: "Shop" };

const PAGE_SIZE = 9;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const cats = one(sp.cat).split(",").filter(Boolean);
  const brandSlugs = one(sp.brand).split(",").filter(Boolean);
  const cals = one(sp.cal).split(",").filter(Boolean);
  const inStock = one(sp.stock) === "1";
  const q = one(sp.q).trim();
  const sort = one(sp.sort) || "featured";
  const page = Math.max(1, parseInt(one(sp.page) || "1", 10) || 1);

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (cats.length) where.category = { slug: { in: cats } };
  if (brandSlugs.length) where.brand = { slug: { in: brandSlugs } };
  if (cals.length) where.caliber = { in: cals };
  if (inStock) where.inventory = { is: { stock: { gt: 0 } } };
  if (q) where.name = { contains: q, mode: "insensitive" };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price-asc"
      ? { priceInr: "asc" }
      : sort === "price-desc"
        ? { priceInr: "desc" }
        : sort === "rating"
          ? { rating: "desc" }
          : sort === "new"
            ? { createdAt: "desc" }
            : { reviewCount: "desc" };

  const [products, total, categories, brands, calibreRows] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      include: { brand: { select: { name: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ include: { _count: { select: { products: true } } } }),
    prisma.brand.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      distinct: ["caliber"],
      select: { caliber: true },
      where: { caliber: { not: null } },
      orderBy: { caliber: "asc" },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const calibres = calibreRows.map((r) => r.caliber).filter((c): c is string => !!c);

  // current filter state (minus page) for building toggle/page URLs
  const base: Record<string, string> = {};
  for (const k of ["cat", "brand", "cal", "stock", "q", "sort"]) {
    const v = one(sp[k]);
    if (v) base[k] = v;
  }
  const toggle = (key: string, value: string): string => {
    const set = new Set((base[key] ?? "").split(",").filter(Boolean));
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) if (k !== key && v) p.set(k, v);
    const joined = [...set].join(",");
    if (joined) p.set(key, joined);
    const s = p.toString();
    return s ? `/shop?${s}` : "/shop";
  };
  const pageUrl = (n: number): string => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  const activeCat = cats.length === 1 ? categories.find((c) => c.slug === cats[0]) : null;
  const heading = activeCat?.name ?? (q ? `Results for “${q}”` : "Shop");

  return (
    <>
      <PageHeader
        title={heading}
        crumbs={[{ label: "Home", href: "/" }, { label: activeCat ? `Shop · ${activeCat.name}` : "Shop" }]}
        sub="Precision match rifles, pistols, pellets and pro-grade gear from the world's top makers — every unit GST-billed and shipped pan-India."
      />

      <section className="section--tight" style={{ padding: "34px 0 80px" }}>
        <div className="wrap">
          <div className="toolbar">
            <div className="toolbar__count">
              <b>{total}</b> products{activeCat ? ` · ${activeCat.name}` : ""}
            </div>
            <div className="toolbar__right">
              <Link href="/compare" className="btn btn--ghost btn--sm" style={{ padding: "9px 14px" }}>
                Compare
              </Link>
              <SortSelect />
              <ViewToggle />
            </div>
          </div>

          <div className="listing" data-layout="sidebar" id="listing">
            <aside className="filters">
              <div className="fgroup">
                <h4>Category</h4>
                {categories.map((c) => (
                  <Link key={c.id} href={toggle("cat", c.slug)} className="fopt">
                    <input type="checkbox" readOnly checked={cats.includes(c.slug)} />
                    {c.name}
                    <span className="ct">{c._count.products}</span>
                  </Link>
                ))}
              </div>

              <div className="fgroup">
                <h4>Brand</h4>
                {brands.slice(0, 8).map((b) => (
                  <Link key={b.id} href={toggle("brand", b.slug)} className="fopt">
                    <input type="checkbox" readOnly checked={brandSlugs.includes(b.slug)} />
                    {b.name}
                    <span className="ct">{b._count.products}</span>
                  </Link>
                ))}
              </div>

              <div className="fgroup">
                <h4>Price</h4>
                <div className="priceslider">
                  <span className="knob" style={{ left: "18%" }} />
                  <span className="knob" style={{ left: "76%" }} />
                </div>
                <div className="pricerow">
                  <input defaultValue="₹6,500" />
                  <span style={{ color: "var(--mute)" }}>—</span>
                  <input defaultValue="₹2,40,000" />
                </div>
              </div>

              {calibres.length > 0 && (
                <div className="fgroup">
                  <h4>Calibre</h4>
                  <div className="swatchrow" style={{ gap: 8 }}>
                    {calibres.map((cal) => (
                      <Link
                        key={cal}
                        href={toggle("cal", cal)}
                        className={`optpill${cals.includes(cal) ? " active" : ""}`}
                      >
                        {cal}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="fgroup" style={{ borderBottom: "none" }}>
                <h4>Availability</h4>
                <Link href={toggle("stock", "1")} className="fopt">
                  <input type="checkbox" readOnly checked={inStock} />
                  In Stock
                </Link>
              </div>
            </aside>

            <div>
              <div className="filterbar">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={toggle("cat", c.slug)}
                    className={`fb-chip${cats.includes(c.slug) ? " active" : ""}`}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>

              {products.length > 0 ? (
                <div className="pgrid">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <p className="lead" style={{ padding: "40px 0" }}>
                  No products match these filters.{" "}
                  <Link href="/shop" className="text-blue underline">
                    Clear all
                  </Link>
                </p>
              )}

              {pages > 1 && (
                <nav className="pagination">
                  {page > 1 && (
                    <Link href={pageUrl(page - 1)} aria-label="Previous page">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </Link>
                  )}
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                    <Link key={n} href={pageUrl(n)} className={n === page ? "active" : ""}>
                      {n}
                    </Link>
                  ))}
                  {page < pages && (
                    <Link href={pageUrl(page + 1)} aria-label="Next page">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </Link>
                  )}
                </nav>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
