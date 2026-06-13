import { prisma } from "@/lib/db";
import { PageHead, Panel, inrCompact } from "../_lib/ui";
import { LineChart, Bars, Donut } from "../_lib/charts";

export const metadata = { title: "Reports — VSK Admin" };

const COLORS = ["#1B43C8", "#2E5BE6", "#E11D2B", "#C8961E", "#1FA855", "#7C3AED"];

export default async function AdminReports() {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const since12mo = new Date();
  since12mo.setMonth(since12mo.getMonth() - 11);
  since12mo.setDate(1);
  since12mo.setHours(0, 0, 0, 0);

  const [revenueYtd, ordersYtd, customersYtd, totalCustomers, chartOrders, orderItems, customerMix] =
    await Promise.all([
      prisma.order.aggregate({
        _sum: { totalInr: true },
        where: { paymentStatus: "PAID", createdAt: { gte: yearStart } },
      }),
      prisma.order.count({ where: { createdAt: { gte: yearStart } } }),
      prisma.user.count({ where: { role: { in: ["CUSTOMER", "DEALER"] }, createdAt: { gte: yearStart } } }),
      prisma.user.count({ where: { role: { in: ["CUSTOMER", "DEALER"] } } }),
      prisma.order.findMany({
        where: { paymentStatus: "PAID", createdAt: { gte: since12mo } },
        select: { createdAt: true, totalInr: true },
      }),
      prisma.orderItem.findMany({
        include: {
          product: { include: { category: true } },
          order: { include: { user: true } },
        },
      }),
      prisma.user.groupBy({
        by: ["customerType"],
        _count: true,
        where: { role: { in: ["CUSTOMER", "DEALER"] } },
      }),
    ]);

  // monthly revenue trend
  const months: { key: string; label: string; rev: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(since12mo);
    d.setMonth(d.getMonth() + i);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-IN", { month: "short" }),
      rev: 0,
    });
  }
  for (const o of chartOrders) {
    const m = months.find((x) => x.key === `${o.createdAt.getFullYear()}-${o.createdAt.getMonth()}`);
    if (m) m.rev += o.totalInr;
  }
  const maxRev = Math.max(1, ...months.map((m) => m.rev));

  // revenue by channel (customer type of the order's user)
  const channel = new Map<string, number>();
  let channelSum = 0;
  for (const it of orderItems) {
    const t = it.order.user?.customerType ?? "INDIVIDUAL";
    const label = t === "DEALER" ? "Dealers" : t === "ACADEMY" ? "Academies" : "Online Store";
    const amt = it.unitPriceInr * it.quantity;
    channel.set(label, (channel.get(label) ?? 0) + amt);
    channelSum += amt;
  }
  const channelRows = [...channel.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([n, v], i): [string, number, string] => [
      n,
      channelSum ? Math.round((v / channelSum) * 100) : 0,
      ["#1B43C8", "#E11D2B", "#C8961E"][i % 3],
    ]);

  // top categories + top products by revenue
  const cats = new Map<string, number>();
  const prods = new Map<string, { name: string; sold: number; rev: number }>();
  let catSum = 0;
  for (const it of orderItems) {
    const c = it.product?.category?.name ?? "Other";
    const amt = it.unitPriceInr * it.quantity;
    cats.set(c, (cats.get(c) ?? 0) + amt);
    catSum += amt;
    const key = it.productId ?? it.name;
    const p = prods.get(key) ?? { name: it.product?.name ?? it.name, sold: 0, rev: 0 };
    p.sold += it.quantity;
    p.rev += amt;
    prods.set(key, p);
  }
  const catRows = [...cats.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n, v], i): [string, number, string] => [
      n,
      catSum ? Math.round((v / catSum) * 100) : 0,
      COLORS[i % COLORS.length],
    ]);
  const topProducts = [...prods.values()].sort((a, b) => b.rev - a.rev).slice(0, 6);

  // customer mix donut
  const mixTotal = customerMix.reduce((s, m) => s + m._count, 0) || 1;
  const mixLabel: Record<string, string> = {
    INDIVIDUAL: "Individuals",
    ACADEMY: "Academies",
    DEALER: "Dealers",
  };
  const mixColor: Record<string, string> = {
    INDIVIDUAL: "#1B43C8",
    ACADEMY: "#7C3AED",
    DEALER: "#E11D2B",
  };
  const donutSegs = customerMix.map(
    (m): [string, number, string] => [
      mixLabel[m.customerType] ?? m.customerType,
      Math.round((m._count / mixTotal) * 100),
      mixColor[m.customerType] ?? "#C8961E",
    ],
  );

  return (
    <div>
      <PageHead title={<>Reports &amp; Analytics</>} sub="Performance insights · last 12 months" />

      <div className="kpis">
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__ic blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg></span></div>
          <div className="kpi__val">{inrCompact(revenueYtd._sum.totalInr ?? 0)}</div>
          <div className="kpi__lab">Revenue YTD</div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__ic green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2l1.5 3h9L18 2M3 6h18l-1.5 13a2 2 0 01-2 2H6.5a2 2 0 01-2-2L3 6z" /></svg></span></div>
          <div className="kpi__val">{ordersYtd}</div>
          <div className="kpi__lab">Orders YTD</div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__ic amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg></span></div>
          <div className="kpi__val">{customersYtd}</div>
          <div className="kpi__lab">New Customers YTD</div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi__ic red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg></span></div>
          <div className="kpi__val">{totalCustomers}</div>
          <div className="kpi__lab">Total Customers</div>
        </div>
      </div>

      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title="Revenue Trend" sub="Monthly · paid orders">
          <LineChart
            max={110}
            labels={months.map((m, i) => (i % 2 ? m.label : ""))}
            series={[{ data: months.map((m) => (m.rev / maxRev) * 100), color: "#1B43C8", area: true }]}
          />
        </Panel>
        <Panel title="Revenue by Channel">
          <Bars rows={channelRows} />
        </Panel>
      </div>

      <div className="adm-grid adm-grid--2" style={{ marginTop: 16 }}>
        <Panel title="Top Categories">
          <Bars rows={catRows} />
        </Panel>
        <Panel title="Customer Mix">
          <Donut segs={donutSegs} />
        </Panel>
      </div>

      <div className="adm-grid" style={{ marginTop: 16 }}>
        <Panel title="Top Products" sub="By revenue" pad={false}>
          <div style={{ overflowX: "auto" }}>
            <table className="dtbl">
              <thead>
                <tr><th>Product</th><th className="num">Units Sold</th><th className="num" style={{ textAlign: "right" }}>Revenue</th></tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.name}>
                    <td><b style={{ fontWeight: 600 }}>{p.name}</b></td>
                    <td className="num">{p.sold}</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 700 }}>{inrCompact(p.rev)}</td>
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
