import Link from "next/link";
import { prisma } from "@/lib/db";
import { one, type SP } from "../_lib/admin";
import { PageHead, Panel, Badge, Av, SearchBox, inrCompact, ago } from "../_lib/ui";

export const metadata = { title: "Dealers — VSK Admin" };

const TIER_COLOR: Record<string, string> = {
  GOLD: "#C8961E",
  PLATINUM: "#7C3AED",
  STANDARD: "#7B8794",
};

export default async function AdminDealers({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim();

  const [pendingApps, dealers, activeCount] = await Promise.all([
    prisma.dealerApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dealerProfile.findMany({
      where: q
        ? {
            OR: [
              { businessName: { contains: q, mode: "insensitive" } },
              { user: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : undefined,
      include: {
        user: {
          include: {
            _count: { select: { orders: true } },
            orders: { where: { paymentStatus: "PAID" }, select: { totalInr: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dealerProfile.count(),
  ]);

  return (
    <div>
      <PageHead
        title="Dealers"
        sub={`${activeCount} active partners · ${pendingApps.length} pending application${pendingApps.length === 1 ? "" : "s"}`}
      />

      {/* PENDING APPLICATIONS */}
      <Panel
        title="Pending Applications"
        sub="Review & approve new dealer requests"
        pad={false}
        style={{ marginBottom: 16 }}
        action={<Badge tone="b-amber">{pendingApps.length} awaiting</Badge>}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="dtbl">
            <thead>
              <tr><th>Business</th><th>Contact</th><th>Location</th><th>Type</th><th>Applied</th><th style={{ textAlign: "right" }}>Decision</th></tr>
            </thead>
            <tbody>
              {pendingApps.length === 0 && (
                <tr><td colSpan={6} className="muted">No pending applications.</td></tr>
              )}
              {pendingApps.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="cell-cust">
                      <Av name={a.business} tone="amber" />
                      <b style={{ fontWeight: 600 }}>{a.business}</b>
                    </span>
                  </td>
                  <td style={{ color: "var(--ink-2)" }}>{a.contactName}</td>
                  <td style={{ color: "var(--ink-2)" }}>{[a.city, a.state].filter(Boolean).join(", ") || "—"}</td>
                  <td><Badge tone="b-gray">{a.businessType ?? "—"}</Badge></td>
                  <td className="muted" style={{ color: "var(--ink-2)" }}>{ago(a.createdAt)}</td>
                  <td>
                    <div className="row-act" style={{ gap: 8 }}>
                      <Link href={`/admin/dealers/applications/${a.id}`} className="btn btn--primary btn--sm" style={{ padding: "6px 12px", width: "auto", height: "auto" }}>
                        Review
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ACTIVE DEALERS */}
      <Panel>
        <div className="tbl-tools">
          <div className="seg">
            <Link href="/admin/dealers" className="active" style={{ fontWeight: 600, fontSize: 13, padding: "9px 14px", background: "var(--ink)", color: "#fff" }}>All Active</Link>
          </div>
          <SearchBox placeholder="Search dealers" defaultValue={q} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="dtbl">
            <thead>
              <tr><th>Dealer</th><th>Territory</th><th className="num">Orders</th><th className="num">Revenue</th><th>Tier</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {dealers.length === 0 && (
                <tr><td colSpan={7} className="muted">No active dealers.</td></tr>
              )}
              {dealers.map((d) => {
                const revenue = d.user.orders.reduce((s, o) => s + o.totalInr, 0);
                return (
                  <tr key={d.id}>
                    <td>
                      <span className="cell-cust">
                        <Av name={d.businessName} />
                        <span>
                          <b style={{ fontWeight: 600, display: "block" }}>{d.businessName}</b>
                          <span className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{d.user.email}</span>
                        </span>
                      </span>
                    </td>
                    <td style={{ color: "var(--ink-2)" }}>{d.territory ?? "—"}</td>
                    <td className="num">{d.user._count.orders}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{inrCompact(revenue)}</td>
                    <td>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: TIER_COLOR[d.tier] ?? "var(--steel)", textTransform: "uppercase", fontSize: 13 }}>
                        {d.tier}
                      </span>
                    </td>
                    <td><Badge tone="b-green">Active</Badge></td>
                    <td>
                      <div className="row-act">
                        <Link href={`/admin/customers/${d.userId}`} title="View">
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
      </Panel>
    </div>
  );
}
