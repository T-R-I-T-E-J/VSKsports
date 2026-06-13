import Link from "next/link";
import type { Prisma, CustomerType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { one, type SP } from "../_lib/admin";
import { PageHead, Panel, Badge, Av, Pagination, SegLinks, SearchBox, CUSTOMER_TYPE_TONE } from "../_lib/ui";

export const metadata = { title: "Customers — VSK Admin" };

const PAGE_SIZE = 10;

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const seg = one(sp.type) || "all";
  const page = Math.max(1, parseInt(one(sp.page) || "1", 10) || 1);
  const since30 = new Date(Date.now() - 30 * 86400_000);

  const where: Prisma.UserWhereInput = { role: { in: ["CUSTOMER", "DEALER"] } };
  if (["INDIVIDUAL", "ACADEMY", "DEALER"].includes(seg)) where.customerType = seg as CustomerType;
  if (q)
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];

  const [total, registered, newThisMonth, customers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: { in: ["CUSTOMER", "DEALER"] } } }),
    prisma.user.count({ where: { role: { in: ["CUSTOMER", "DEALER"] }, createdAt: { gte: since30 } } }),
    prisma.user.findMany({
      where,
      include: {
        _count: { select: { orders: true } },
        orders: { where: { paymentStatus: "PAID" }, select: { totalInr: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const segHref = (s: string) => `/admin/customers?type=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <PageHead
        title="Customers"
        sub={`${registered} registered · ${newThisMonth} new this month`}
      />

      <Panel>
        <div className="tbl-tools">
          <SegLinks
            active={seg}
            options={[
              { label: "All", value: "all", href: segHref("all") },
              { label: "Individuals", value: "INDIVIDUAL", href: segHref("INDIVIDUAL") },
              { label: "Academies", value: "ACADEMY", href: segHref("ACADEMY") },
              { label: "Dealers", value: "DEALER", href: segHref("DEALER") },
            ]}
          />
          <SearchBox placeholder="Search customers" defaultValue={q} hidden={{ type: seg }} />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="dtbl">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type</th>
                <th>Location</th>
                <th className="num">Orders</th>
                <th className="num">Lifetime</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr><td colSpan={7} className="muted">No customers match.</td></tr>
              )}
              {customers.map((c) => {
                const [tone, label] = CUSTOMER_TYPE_TONE[c.customerType] ?? ["b-gray", c.customerType];
                const lifetime = c.orders.reduce((s, o) => s + o.totalInr, 0);
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="cell-cust">
                        <Av name={c.name} />
                        <span>
                          <b style={{ fontWeight: 600, display: "block" }}>{c.name ?? "—"}</b>
                          <span className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{c.email}</span>
                        </span>
                      </span>
                    </td>
                    <td><Badge tone={tone}>{label}</Badge></td>
                    <td style={{ color: "var(--ink-2)" }}>{c.location ?? "—"}</td>
                    <td className="num">{c._count.orders}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{formatINR(lifetime)}</td>
                    <td className="muted" style={{ color: "var(--ink-2)" }}>
                      {c.createdAt.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </td>
                    <td>
                      <div className="row-act">
                        <Link href={`/admin/customers/${c.id}`} title="View">
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
          base={`/admin/customers?type=${seg}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          label="customers"
        />
      </Panel>
    </div>
  );
}
