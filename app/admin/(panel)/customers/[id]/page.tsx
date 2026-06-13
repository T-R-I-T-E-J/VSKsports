import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import {
  PageHead,
  Crumb,
  Panel,
  Badge,
  Av,
  InfoRow,
  ORDER_TONE,
  CUSTOMER_TYPE_TONE,
  fmtDate,
  inrCompact,
  ago,
} from "../../_lib/ui";
import { addCustomerNote } from "../actions";

export const metadata = { title: "Customer — VSK Admin" };

export default async function AdminCustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } },
      addresses: { orderBy: { isDefault: "desc" } },
      customerNotes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      dealerProfile: true,
    },
  });
  if (!customer || customer.role === "ADMIN" || customer.role === "STAFF") notFound();

  const paidOrders = customer.orders.filter((o) => o.paymentStatus === "PAID");
  const lifetime = paidOrders.reduce((s, o) => s + o.totalInr, 0);
  const avg = paidOrders.length ? Math.round(lifetime / paidOrders.length) : 0;
  const [tone, label] = CUSTOMER_TYPE_TONE[customer.customerType] ?? ["b-gray", customer.customerType];
  const addr = customer.addresses[0];
  const tierLabel = customer.loyaltyTier[0] + customer.loyaltyTier.slice(1).toLowerCase();

  return (
    <div>
      <Crumb items={[["Customers", "/admin/customers"], [customer.name ?? customer.email]]} />
      <PageHead
        title={customer.name ?? customer.email}
        badge={<Badge tone={tone}>{label}</Badge>}
        sub={`Customer since ${customer.createdAt.toLocaleDateString("en-IN", { month: "short", year: "numeric" })} · ${tierLabel} member`}
        actions={
          <Link href={`/admin/customers/${customer.id}/edit`} className="btn btn--primary btn--sm">
            Edit
          </Link>
        }
      />

      <div className="od-grid">
        {/* LEFT */}
        <div style={{ display: "grid", gap: 16 }}>
          <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{customer.orders.length}</div><div className="kpi__lab">Total Orders</div></div>
            <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{inrCompact(lifetime)}</div><div className="kpi__lab">Lifetime Value</div></div>
            <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{inrCompact(avg)}</div><div className="kpi__lab">Avg. Order</div></div>
          </div>

          <Panel title="Order History" pad={false}>
            <div style={{ overflowX: "auto" }}>
              <table className="dtbl">
                <thead>
                  <tr><th>Order</th><th>Date</th><th>Items</th><th>Status</th><th className="num" style={{ textAlign: "right" }}>Total</th></tr>
                </thead>
                <tbody>
                  {customer.orders.length === 0 && (
                    <tr><td colSpan={5} className="muted">No orders yet.</td></tr>
                  )}
                  {customer.orders.map((o) => {
                    const [otone, olabel] = ORDER_TONE[o.status];
                    return (
                      <tr key={o.id}>
                        <td><Link href={`/admin/orders/${o.id}`} className="strong" style={{ color: "var(--blue)" }}>#{o.number}</Link></td>
                        <td className="muted" style={{ color: "var(--ink-2)" }}>{fmtDate(o.createdAt)}</td>
                        <td style={{ color: "var(--ink-2)" }}>{o._count.items} item{o._count.items === 1 ? "" : "s"}</td>
                        <td><Badge tone={otone}>{olabel}</Badge></td>
                        <td className="num" style={{ textAlign: "right", fontWeight: 700 }}>{formatINR(o.totalInr)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Staff Notes" sub="Internal CRM timeline">
            <form action={addCustomerNote} style={{ marginBottom: 14 }}>
              <input type="hidden" name="userId" value={customer.id} />
              <div className="afield" style={{ marginBottom: 10 }}>
                <textarea name="body" placeholder="Add a note visible to staff only…" style={{ minHeight: 70 }} required />
              </div>
              <button className="btn btn--primary btn--sm">Add Note</button>
            </form>
            <div className="actlist">
              {customer.customerNotes.length === 0 && (
                <div className="actitem"><div className="actitem__b">No notes yet.</div></div>
              )}
              {customer.customerNotes.map((n) => (
                <div key={n.id} className="actitem">
                  <span className="actitem__ic" style={{ background: "var(--blue-wash)", color: "var(--blue)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </span>
                  <div className="actitem__b">
                    <b>{n.author?.name ?? "Staff"}</b> — {n.body}
                  </div>
                  <span className="actitem__t">{ago(n.createdAt)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* RIGHT */}
        <div style={{ display: "grid", gap: 16 }}>
          <Panel>
            <div style={{ textAlign: "center" }}>
              <span style={{ display: "inline-block", marginBottom: 12 }}>
                <Av name={customer.name} size={64} />
              </span>
              <b style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, textTransform: "uppercase", display: "block" }}>
                {customer.name ?? "—"}
              </b>
              <span style={{ display: "inline-block", marginTop: 8 }}>
                <Badge tone="b-amber">{tierLabel} Member · {customer.loyaltyPoints.toLocaleString("en-IN")} pts</Badge>
              </span>
            </div>
          </Panel>

          <Panel title="Contact">
            <InfoRow k="Email" v={customer.email} />
            <InfoRow k="Phone" v={customer.phone ?? "—"} />
            <InfoRow k="Location" v={customer.location ?? "—"} />
            <InfoRow k="GST" v={customer.dealerProfile?.gstNumber ?? "—"} />
          </Panel>

          <Panel title="Default Address">
            {addr ? (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)" }}>
                {addr.line1}
                {addr.line2 ? <><br />{addr.line2}</> : null}
                <br />
                {addr.city} {addr.pincode}, {addr.state}
                {addr.phone ? <><br />{addr.phone}</> : null}
              </p>
            ) : (
              <p className="muted" style={{ fontSize: 14 }}>No address on file.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
