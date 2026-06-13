import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { one, type SP } from "../_lib/admin";
import { PageHead, Panel, Badge, Thumb, SegLinks, SearchBox, inrCompact } from "../_lib/ui";
import { adjustStock } from "./actions";

export const metadata = { title: "Inventory — VSK Admin" };

export default async function AdminInventory({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const seg = one(sp.f) || "all";

  const where: Prisma.InventoryItemWhereInput = {};
  if (q)
    where.OR = [
      { sku: { contains: q, mode: "insensitive" } },
      { product: { name: { contains: q, mode: "insensitive" } } },
    ];
  if (seg === "out") where.stock = { lte: 0 };
  if (seg === "low")
    where.AND = [
      { stock: { gt: 0 } },
      { stock: { lte: prisma.inventoryItem.fields.reorderPoint } },
    ];
  if (seg === "in") where.stock = { gt: prisma.inventoryItem.fields.reorderPoint };

  const [items, totalCount, outCount, allItems] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      include: {
        product: { include: { images: { take: 1, orderBy: { position: "asc" } } } },
      },
      orderBy: { stock: "asc" },
    }),
    prisma.inventoryItem.count(),
    prisma.inventoryItem.count({ where: { stock: { lte: 0 } } }),
    prisma.inventoryItem.findMany({ include: { product: { select: { priceInr: true } } } }),
  ]);

  const lowCount = allItems.filter((i) => i.stock > 0 && i.stock <= i.reorderPoint).length;
  const inCount = totalCount - lowCount - outCount;
  const stockValue = allItems.reduce((s, i) => s + i.stock * i.product.priceInr, 0);

  const segHref = (s: string) => `/admin/inventory?f=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <PageHead
        title="Inventory"
        sub={`${totalCount} SKUs tracked · ${lowCount + outCount} need attention`}
      />

      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__ic green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg></span></div>
          <div className="kpi__val" style={{ fontSize: 28 }}>{inCount}</div>
          <div className="kpi__lab">In Stock</div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__ic amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg></span></div>
          <div className="kpi__val" style={{ fontSize: 28 }}>{lowCount}</div>
          <div className="kpi__lab">Low Stock</div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__ic red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg></span></div>
          <div className="kpi__val" style={{ fontSize: 28 }}>{outCount}</div>
          <div className="kpi__lab">Out of Stock</div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__ic blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg></span></div>
          <div className="kpi__val" style={{ fontSize: 28 }}>{inrCompact(stockValue)}</div>
          <div className="kpi__lab">Stock Value</div>
        </div>
      </div>

      <Panel>
        <div className="tbl-tools">
          <SegLinks
            active={seg}
            options={[
              { label: "All", value: "all", href: segHref("all") },
              { label: "In Stock", value: "in", href: segHref("in") },
              { label: "Low", value: "low", href: segHref("low") },
              { label: "Out", value: "out", href: segHref("out") },
            ]}
          />
          <SearchBox placeholder="Search SKU / product" defaultValue={q} hidden={{ f: seg }} />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="dtbl">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th className="num">In Stock</th>
                <th className="num">Reserved</th>
                <th className="num">Reorder At</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Adjust</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={7} className="muted">No inventory items match.</td></tr>
              )}
              {items.map((it) => {
                const [tone, label] =
                  it.stock <= 0
                    ? ["b-red", "Out"]
                    : it.stock <= it.reorderPoint
                      ? ["b-amber", "Low"]
                      : ["b-green", "Healthy"];
                const low = it.stock <= it.reorderPoint;
                return (
                  <tr key={it.id} style={low ? { background: "rgba(253,243,220,.35)" } : undefined}>
                    <td>
                      <span className="cell-prod">
                        <Thumb src={it.product.images[0]?.url} alt={it.product.name} label={it.sku.slice(4, 7)} />
                        <span><b>{it.product.name}</b></span>
                      </span>
                    </td>
                    <td className="muted" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-2)" }}>{it.sku}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{it.stock}</td>
                    <td className="num" style={{ color: "var(--steel)" }}>{it.reserved}</td>
                    <td className="num" style={{ color: "var(--mute)" }}>{it.reorderPoint}</td>
                    <td><Badge tone={tone}>{label}</Badge></td>
                    <td>
                      <form action={adjustStock}>
                        <input type="hidden" name="id" value={it.id} />
                        <div className="row-act" style={{ gap: 6, alignItems: "center" }}>
                          <input
                            name="delta"
                            placeholder="±qty"
                            style={{ width: 64, height: 30, border: "1px solid var(--line-2)", borderRadius: 6, padding: "0 8px", fontFamily: "var(--font-mono)", fontSize: 13, textAlign: "center" }}
                          />
                          <input
                            name="reason"
                            placeholder="reason"
                            style={{ width: 110, height: 30, border: "1px solid var(--line-2)", borderRadius: 6, padding: "0 8px", fontSize: 12 }}
                          />
                          <button className="btn btn--ghost btn--sm" style={{ padding: "5px 10px" }}>
                            Apply
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
