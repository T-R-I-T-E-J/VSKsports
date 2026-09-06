// Nonce-based CSP requires per-request rendering: a prerendered page would ship
// HTML baked at build time, whose scripts carry no nonce matching the CSP header
// issued for the request — the browser would block every script on the page.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { PageHead, Panel, Badge, Av, Thumb, ORDER_TONE, inrCompact, ago } from "../_lib/ui";
import { LineChart, Bars } from "../_lib/charts";

export const metadata = { title: "Dashboard — VSK Admin" };

const CAT_COLORS = ["#1B43C8", "#2E5BE6", "#E11D2B", "#C8961E", "#1FA855", "#7C3AED"];

export default async function AdminDashboard() {
  // Async Server Component: this renders once per request on the server, so
  // reading the clock is correct here and carries none of the re-render hazards
  // the purity rule guards against.
  // eslint-disable-next-line react-hooks/purity -- server-rendered once per request
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const since12mo = new Date();
  since12mo.setMonth(since12mo.getMonth() - 11);
  since12mo.setDate(1);
  since12mo.setHours(0, 0, 0, 0);

  const [
    revenueAgg,
    orderCount30,
    customerCount,
    newCustomers30,
    lowStockItems,
    recentOrders,
    activity,
    chartOrders,
    orderItems,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalInr: true },
      _count: true,
      where: { paymentStatus: "PAID" },
    }),
    prisma.order.count({ where: { createdAt: { gte: since30 } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since30 } } }),
    prisma.inventoryItem.findMany({
      where: { OR: [{ stock: 0 }, { stock: { lte: prisma.inventoryItem.fields.reorderPoint } }] },
      include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } },
      orderBy: { stock: "asc" },
      take: 5,
    }),
    prisma.order.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.staffAction.findMany({
      include: { staff: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: since12mo } },
      select: { createdAt: true, totalInr: true, paymentStatus: true },
    }),
    prisma.orderItem.findMany({
      include: {
        product: {
          include: {
            category: true,
            images: { take: 1, orderBy: { position: "asc" } },
            brand: true,
          },
        },
      },
    }),
  ]);

  const paidRevenue = revenueAgg._sum.totalInr ?? 0;
  const paidCount = revenueAgg._count;
  const aov = paidCount ? Math.round(paidRevenue / paidCount) : 0;

  // monthly revenue + order series (last 12 months)
  const months: { key: string; label: string; rev: number; ord: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(since12mo);
    d.setMonth(d.getMonth() + i);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-IN", { month: "short" }),
      rev: 0,
      ord: 0,
    });
  }
  for (const o of chartOrders) {
    const key = `${o.createdAt.getFullYear()}-${o.createdAt.getMonth()}`;
    const m = months.find((x) => x.key === key);
    if (!m) continue;
    m.ord += 1;
    if (o.paymentStatus === "PAID") m.rev += o.totalInr;
  }
  const maxRev = Math.max(1, ...months.map((m) => m.rev));
  const maxOrd = Math.max(1, ...months.map((m) => m.ord));
  const revSeries = months.map((m) => (m.rev / maxRev) * 100);
  const ordSeries = months.map((m) => (m.ord / maxOrd) * 100);

  // category split from order items
  const catTotals = new Map<string, number>();
  let catSum = 0;
  for (const it of orderItems) {
    const cat = it.product?.category?.name ?? "Other";
    const amt = it.unitPriceInr * it.quantity;
    catTotals.set(cat, (catTotals.get(cat) ?? 0) + amt);
    catSum += amt;
  }
  const catRows = [...catTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, amt], i): [string, number, string] => [
      name,
      catSum ? Math.round((amt / catSum) * 100) : 0,
      CAT_COLORS[i % CAT_COLORS.length],
    ]);

  // top products by units sold
  const prodTotals = new Map<
    string,
    { name: string; cat: string; img?: string | null; brand: string; sold: number; rev: number }
  >();
  for (const it of orderItems) {
    const key = it.productId ?? it.name;
    const cur = prodTotals.get(key) ?? {
      name: it.product?.name ?? it.name,
      cat: it.product?.category?.name ?? "—",
      img: it.product?.images[0]?.url,
      brand: it.product?.brand?.name ?? "VSK",
      sold: 0,
      rev: 0,
    };
    cur.sold += it.quantity;
    cur.rev += it.unitPriceInr * it.quantity;
    prodTotals.set(key, cur);
  }
  const topProducts = [...prodTotals.values()].sort((a, b) => b.sold - a.sold).slice(0, 4);

  return (
    <div>
      <PageHead
        title="Dashboard"
        sub="Welcome back — here's how VSK Sports is performing."
      />

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi">
          <div className="kpi__top">
            <span className="kpi__ic blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
            </span>
          </div>
          <div className="kpi__val">{inrCompact(paidRevenue)}</div>
          <div className="kpi__lab">Revenue (paid)</div>
        </div>
        <div className="kpi">
          <div className="kpi__top">
            <span className="kpi__ic green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2l1.5 3h9L18 2M3 6h18l-1.5 13a2 2 0 01-2 2H6.5a2 2 0 01-2-2L3 6z" /></svg>
            </span>
          </div>
          <div className="kpi__val">{orderCount30}</div>
          <div className="kpi__lab">Orders (30d)</div>
        </div>
        <div className="kpi">
          <div className="kpi__top">
            <span className="kpi__ic amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg>
            </span>
          </div>
          <div className="kpi__val">{inrCompact(aov)}</div>
          <div className="kpi__lab">Avg. Order Value</div>
        </div>
        <div className="kpi">
          <div className="kpi__top">
            <span className="kpi__ic red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
            </span>
          </div>
          <div className="kpi__val">{customerCount}</div>
          <div className="kpi__lab">Customers · {newCustomers30} new (30d)</div>
        </div>
      </div>

      {/* charts */}
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel
          title="Sales Overview"
          sub="Revenue vs orders · last 12 months"
          action={
            <div className="chart-legend">
              <span><i style={{ background: "#1B43C8" }}></i>Revenue</span>
              <span><i style={{ background: "#E11D2B" }}></i>Orders</span>
            </div>
          }
        >
          <LineChart
            max={110}
            labels={months.map((m, i) => (i % 2 ? m.label : ""))}
            series={[
              { data: revSeries, color: "#1B43C8", area: true },
              { data: ordSeries, color: "#E11D2B", dashed: true },
            ]}
          />
        </Panel>
        <Panel title="Sales by Category" sub="All time">
          <Bars rows={catRows} />
        </Panel>
      </div>

      {/* recent orders + activity */}
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel
          title="Recent Orders"
          pad={false}
          action={<Link href="/admin/orders" className="btn btn--ghost btn--sm">View all</Link>}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="dtbl">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Status</th><th style={{ textAlign: "right" }}>Total</th></tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => {
                  const [tone, label] = ORDER_TONE[o.status];
                  return (
                    <tr key={o.id}>
                      <td><Link href={`/admin/orders/${o.id}`} className="strong" style={{ color: "var(--blue)" }}>#{o.number}</Link></td>
                      <td><span className="cell-cust"><Av name={o.user?.name} />{o.user?.name ?? "Guest"}</span></td>
                      <td><Badge tone={tone}>{label}</Badge></td>
                      <td className="num" style={{ textAlign: "right", fontWeight: 700 }}>{formatINR(o.totalInr)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Recent Activity">
          <div className="actlist" style={{ marginTop: -8 }}>
            {activity.length === 0 && (
              <div className="actitem"><div className="actitem__b">No staff activity yet.</div></div>
            )}
            {activity.map((a) => (
              <div key={a.id} className="actitem">
                <span className="actitem__ic" style={{ background: "var(--blue-wash)", color: "var(--blue)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 13l4 4L19 7" /></svg>
                </span>
                <div className="actitem__b">
                  <b>{a.staff.name ?? "Staff"}</b> — {a.action.replaceAll("_", " ").toLowerCase()}{" "}
                  {a.detail ? <>· {a.detail}</> : null}
                </div>
                <span className="actitem__t">{ago(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* top products + low stock */}
      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel
          title="Top Products"
          sub="By units sold"
          pad={false}
          action={<Link href="/admin/products" className="btn btn--ghost btn--sm">Manage</Link>}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="dtbl">
              <thead>
                <tr><th>Product</th><th className="num">Sold</th><th className="num" style={{ textAlign: "right" }}>Revenue</th></tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.name}>
                    <td>
                      <span className="cell-prod">
                        <Thumb src={p.img} alt={p.name} label={p.brand.slice(0, 3)} />
                        <span><b>{p.name}</b><span>{p.cat}</span></span>
                      </span>
                    </td>
                    <td className="num">{p.sold}</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 700 }}>{inrCompact(p.rev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel
          title="Low Stock Alerts"
          sub="Reorder soon"
          pad={false}
          action={<Link href="/admin/inventory" className="btn btn--ghost btn--sm">Inventory</Link>}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="dtbl">
              <thead>
                <tr><th>Product</th><th>Status</th><th className="num" style={{ textAlign: "right" }}>Qty</th></tr>
              </thead>
              <tbody>
                {lowStockItems.length === 0 && (
                  <tr><td colSpan={3} className="muted">All stock levels healthy.</td></tr>
                )}
                {lowStockItems.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <span className="cell-prod">
                        <Thumb src={it.product.images[0]?.url} alt={it.product.name} label={it.sku.slice(4, 7)} />
                        <span><b>{it.product.name}</b></span>
                      </span>
                    </td>
                    <td>
                      <Badge tone={it.stock === 0 ? "b-red" : "b-amber"}>
                        {it.stock === 0 ? "Out of stock" : "Low"}
                      </Badge>
                    </td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 700 }}>{it.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
