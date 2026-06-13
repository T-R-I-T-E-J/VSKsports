import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { one, type SP } from "../_lib/admin";
import { PageHead, Panel, Badge, Thumb, Pagination, SegLinks, SearchBox } from "../_lib/ui";
import { toggleProductActive } from "./actions";

export const metadata = { title: "Products — VSK Admin" };

const PAGE_SIZE = 10;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const status = one(sp.status) || "all";
  const cat = one(sp.cat);
  const page = Math.max(1, parseInt(one(sp.page) || "1", 10) || 1);

  const where: Prisma.ProductWhereInput = {};
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (cat) where.category = { slug: cat };
  if (status === "active") where.isActive = true;
  if (status === "draft") where.isActive = false;
  if (status === "oos") where.inventory = { is: { stock: { lte: 0 } } };

  const [total, allCount, activeCount, draftCount, oosCount, products, categories] =
    await Promise.all([
      prisma.product.count({ where }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: false } }),
      prisma.product.count({ where: { inventory: { is: { stock: { lte: 0 } } } } }),
      prisma.product.findMany({
        where,
        include: {
          brand: true,
          category: true,
          inventory: true,
          images: { take: 1, orderBy: { position: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
    ]);

  const catCount = await prisma.category.count();
  const segHref = (s: string) =>
    `/admin/products?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}${cat ? `&cat=${cat}` : ""}`;

  return (
    <div>
      <PageHead
        title="Products"
        sub={`${allCount} products across ${catCount} categories`}
        actions={
          <Link href="/admin/products/new" className="btn btn--primary btn--sm">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            Add Product
          </Link>
        }
      />

      <Panel>
        <div className="tbl-tools">
          <div className="tbl-tools__left">
            <SegLinks
              active={status}
              options={[
                { label: <>All <span style={{ opacity: 0.6 }}>{allCount}</span></>, href: segHref("all"), value: "all" },
                { label: `Active ${activeCount}`, href: segHref("active"), value: "active" },
                { label: `Draft ${draftCount}`, href: segHref("draft"), value: "draft" },
                { label: `Out of stock ${oosCount}`, href: segHref("oos"), value: "oos" },
              ]}
            />
          </div>
          <div className="tbl-tools__left">
            <SearchBox placeholder="Search products" defaultValue={q} hidden={{ status, cat }} />
            <form method="GET">
              <input type="hidden" name="status" value={status} />
              {q && <input type="hidden" name="q" value={q} />}
              <select
                name="cat"
                defaultValue={cat}
                style={{ border: "1px solid var(--line-2)", borderRadius: "var(--r)", padding: "8px 12px", fontSize: 13.5, background: "#fff" }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <button className="btn btn--ghost btn--sm" style={{ marginLeft: 8 }}>Filter</button>
            </form>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="dtbl">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Brand</th>
                <th className="num">Price</th>
                <th className="num">Stock</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr><td colSpan={7} className="muted">No products match.</td></tr>
              )}
              {products.map((p) => {
                const stock = p.inventory?.stock ?? 0;
                const [tone, label] = !p.isActive
                  ? ["b-gray", "Draft"]
                  : stock <= 0
                    ? ["b-red", "Out of Stock"]
                    : stock <= (p.inventory?.reorderPoint ?? 0)
                      ? ["b-amber", "Low Stock"]
                      : ["b-green", "Active"];
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="cell-prod">
                        <Thumb src={p.images[0]?.url} alt={p.name} label={(p.brand?.name ?? p.name).slice(0, 3)} />
                        <span>
                          <b>{p.name}</b>
                          <span>{p.inventory?.sku ?? p.slug}</span>
                        </span>
                      </span>
                    </td>
                    <td>{p.category?.name ?? "—"}</td>
                    <td className="muted" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-2)" }}>{p.brand?.name ?? "—"}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{p.restricted ? "Quote" : formatINR(p.priceInr)}</td>
                    <td className="num">{stock}</td>
                    <td><Badge tone={tone}>{label}</Badge></td>
                    <td>
                      <div className="row-act">
                        <Link href={`/admin/products/${p.id}/edit`} title="Edit">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </Link>
                        <Link href={`/product/${p.slug}`} target="_blank" title="View">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
                        </Link>
                        <form action={toggleProductActive}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="del" title={p.isActive ? "Deactivate" : "Activate"}>
                            {p.isActive ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M4.9 4.9l14.2 14.2" /></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
                            )}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          base={`/admin/products?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}${cat ? `&cat=${cat}` : ""}`}
          label="products"
        />
      </Panel>
    </div>
  );
}
