import Link from "next/link";
import type { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { one, type SP } from "../_lib/admin";
import {
  PageHead,
  Panel,
  Badge,
  Av,
  Pagination,
  SegLinks,
  SearchBox,
  PAYMENT_TONE,
  ORDER_TONE,
  fmtDate,
  inrCompact,
} from "../_lib/ui";

export const metadata = { title: "Orders — VSK Admin" };

const PAGE_SIZE = 10;

const SEGMENTS: { value: string; label: string; statuses?: OrderStatus[] }[] = [
  { value: "all", label: "All" },
  { value: "unfulfilled", label: "Unfulfilled", statuses: ["PENDING"] },
  { value: "processing", label: "Processing", statuses: ["PROCESSING", "PAID"] },
  { value: "shipped", label: "Shipped", statuses: ["SHIPPED", "OUT_FOR_DELIVERY"] },
  { value: "delivered", label: "Delivered", statuses: ["DELIVERED"] },
  { value: "cancelled", label: "Cancelled", statuses: ["CANCELLED", "RETURNED"] },
];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const seg = one(sp.status) || "all";
  const page = Math.max(1, parseInt(one(sp.page) || "1", 10) || 1);
  const since30 = new Date(Date.now() - 30 * 86400_000);

  const where: Prisma.OrderWhereInput = {};
  const segDef = SEGMENTS.find((s) => s.value === seg);
  if (segDef?.statuses) where.status = { in: segDef.statuses };
  if (q)
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];

  const [total, orders, count30, rev30, newCount, processingCount, shippedCount, awaitingAgg] =
    await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.order.count({ where: { createdAt: { gte: since30 } } }),
      prisma.order.aggregate({
        _sum: { totalInr: true },
        where: { paymentStatus: "PAID", createdAt: { gte: since30 } },
      }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: { in: ["PROCESSING", "PAID"] } } }),
      prisma.order.count({ where: { status: { in: ["SHIPPED", "OUT_FOR_DELIVERY"] } } }),
      prisma.order.aggregate({
        _sum: { totalInr: true },
        where: { paymentStatus: "PENDING", status: { notIn: ["CANCELLED", "RETURNED"] } },
      }),
    ]);

  const segHref = (s: string) => `/admin/orders?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <PageHead
        title="Orders"
        sub={`${count30} orders this month · ${inrCompact(rev30._sum.totalInr ?? 0)} revenue`}
      />

      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{newCount}</div><div className="kpi__lab">New / Unfulfilled</div></div>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{processingCount}</div><div className="kpi__lab">Processing</div></div>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{shippedCount}</div><div className="kpi__lab">Shipped</div></div>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{inrCompact(awaitingAgg._sum.totalInr ?? 0)}</div><div className="kpi__lab">Awaiting Payment</div></div>
      </div>

      <Panel>
        <div className="tbl-tools">
          <SegLinks
            active={seg}
            options={SEGMENTS.map((s) => ({ label: s.label, value: s.value, href: segHref(s.value) }))}
          />
          <div className="tbl-tools__left">
            <SearchBox placeholder="Search order / customer" defaultValue={q} hidden={{ status: seg }} />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="dtbl">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Fulfilment</th>
                <th className="num" style={{ textAlign: "right" }}>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={7} className="muted">No orders match.</td></tr>
              )}
              {orders.map((o) => {
                const [ptone, plabel] = PAYMENT_TONE[o.paymentStatus];
                const [ftone, flabel] = ORDER_TONE[o.status];
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="strong" style={{ color: "var(--blue)" }}>
                        #{o.number}
                      </Link>
                    </td>
                    <td className="muted" style={{ color: "var(--ink-2)" }}>{fmtDate(o.createdAt)}</td>
                    <td>
                      <span className="cell-cust">
                        <Av name={o.user?.name} />
                        {o.user?.name ?? "Guest"}
                      </span>
                    </td>
                    <td><Badge tone={ptone}>{plabel}</Badge></td>
                    <td><Badge tone={ftone}>{flabel}</Badge></td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 700 }}>{formatINR(o.totalInr)}</td>
                    <td>
                      <div className="row-act">
                        <Link href={`/admin/orders/${o.id}`} title="View">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                        </Link>
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
          base={`/admin/orders?status=${seg}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          label="orders"
        />
      </Panel>
    </div>
  );
}
