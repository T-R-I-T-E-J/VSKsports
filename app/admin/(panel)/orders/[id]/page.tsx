import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { GST_LABEL } from "@/lib/pricing";
import {
  PageHead,
  Crumb,
  Panel,
  Badge,
  Av,
  Thumb,
  InfoRow,
  ORDER_TONE,
  PAYMENT_TONE,
  fmtDateTime,
  inrCompact,
} from "../../_lib/ui";
import { updateOrderStatus, updateOrderNotes } from "../actions";

export const metadata = { title: "Order Detail — VSK Admin" };

const STATUS_OPTIONS = [
  ["PENDING", "Unfulfilled"],
  ["PROCESSING", "Processing"],
  ["SHIPPED", "Shipped"],
  ["OUT_FOR_DELIVERY", "Out for Delivery"],
  ["DELIVERED", "Delivered"],
  ["CANCELLED", "Cancelled"],
] as const;

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { include: { _count: { select: { orders: true } } } },
      address: true,
      items: {
        include: {
          product: { include: { images: { take: 1, orderBy: { position: "asc" } } } },
        },
      },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const lifetime = order.userId
    ? await prisma.order.aggregate({
        _sum: { totalInr: true },
        where: { userId: order.userId, paymentStatus: "PAID" },
      })
    : null;

  const [tone, label] = ORDER_TONE[order.status];
  const [ptone, plabel] = PAYMENT_TONE[order.paymentStatus];

  return (
    <div>
      <Crumb items={[["Orders", "/admin/orders"], [`#${order.number}`]]} />
      <PageHead
        title={`Order #${order.number}`}
        badge={<Badge tone={tone}>{label}</Badge>}
        sub={`Placed ${fmtDateTime(order.createdAt)} · Payment: ${plabel}`}
      />

      <div className="od-grid">
        {/* LEFT */}
        <div style={{ display: "grid", gap: 16 }}>
          <Panel title="Items" sub={`${order.items.length} item${order.items.length === 1 ? "" : "s"}`}>
            {order.items.map((it) => (
              <div key={it.id} className="od-line">
                <Thumb src={it.product?.images[0]?.url} alt={it.name} label={it.name.slice(0, 3)} size={48} />
                <div>
                  <b style={{ fontWeight: 600 }}>{it.name}</b>
                  <div className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)" }}>
                    {it.variantLabel ?? "Standard"}
                  </div>
                </div>
                <div className="num" style={{ color: "var(--steel)" }}>×{it.quantity}</div>
                <div className="num" style={{ fontWeight: 700, textAlign: "right" }}>
                  {formatINR(it.unitPriceInr * it.quantity)}
                </div>
              </div>
            ))}
          </Panel>

          <Panel title="Payment Summary">
            <div className="od-sum"><span>Subtotal</span><b>{formatINR(order.subtotalInr)}</b></div>
            <div className="od-sum">
              <span>Shipping</span>
              {order.shippingInr === 0 ? <b style={{ color: "#1FA855" }}>FREE</b> : <b>{formatINR(order.shippingInr)}</b>}
            </div>
            <div className="od-sum"><span>{GST_LABEL}</span><b>{formatINR(order.gstInr)}</b></div>
            {order.discountInr > 0 && (
              <div className="od-sum"><span>Discount</span><b style={{ color: "#1FA855" }}>−{formatINR(order.discountInr)}</b></div>
            )}
            <div className="od-sum tot"><span>Total</span><b>{formatINR(order.totalInr)}</b></div>
          </Panel>

          <Panel title="Timeline">
            <div className="actlist" style={{ marginTop: -10 }}>
              {order.events.length === 0 && (
                <div className="actitem"><div className="actitem__b">No events recorded yet.</div></div>
              )}
              {order.events.map((e) => {
                const [etone, elabel] = ORDER_TONE[e.status];
                const bg =
                  etone === "b-green"
                    ? "#E4F7EC;#1FA855"
                    : etone === "b-amber"
                      ? "#FDF3DC;#C8961E"
                      : etone === "b-red"
                        ? "var(--red-wash);var(--red)"
                        : "var(--blue-wash);var(--blue)";
                const [b, c] = bg.split(";");
                return (
                  <div key={e.id} className="actitem">
                    <span className="actitem__ic" style={{ background: b, color: c }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 13l4 4L19 7" /></svg>
                    </span>
                    <div className="actitem__b">
                      <b>{elabel}</b>
                      {e.note ? <> — {e.note}</> : null}
                    </div>
                    <span className="actitem__t">{fmtDateTime(e.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Admin Notes">
            <form action={updateOrderNotes}>
              <input type="hidden" name="id" value={order.id} />
              <div className="afield">
                <textarea
                  name="adminNotes"
                  placeholder="Internal notes for this order…"
                  defaultValue={order.adminNotes ?? ""}
                  style={{ minHeight: 80 }}
                />
              </div>
              <button className="btn btn--ghost btn--sm">Save Notes</button>
            </form>
          </Panel>
        </div>

        {/* RIGHT */}
        <div style={{ display: "grid", gap: 16 }}>
          <Panel title="Customer">
            <div className="cell-cust" style={{ marginBottom: 14 }}>
              <Av name={order.user?.name} size={42} />
              <div>
                <b style={{ fontWeight: 700 }}>{order.user?.name ?? "Guest"}</b>
                <div className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)" }}>
                  {order.user
                    ? `${order.user._count.orders} orders · ${inrCompact(lifetime?._sum.totalInr ?? 0)} lifetime`
                    : "guest checkout"}
                </div>
              </div>
            </div>
            {order.user && (
              <>
                <InfoRow k="Email" v={order.user.email} />
                <InfoRow k="Phone" v={order.user.phone ?? "—"} />
                <div style={{ marginTop: 12 }}>
                  <Link href={`/admin/customers/${order.user.id}`} className="btn btn--ghost btn--sm">
                    View Customer
                  </Link>
                </div>
              </>
            )}
          </Panel>

          <Panel title="Shipping Address">
            {order.address ? (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)" }}>
                {order.address.name}
                <br />
                {order.address.line1}
                {order.address.line2 ? <><br />{order.address.line2}</> : null}
                <br />
                {order.address.city} {order.address.pincode}, {order.address.state}
                {order.address.phone ? <><br />{order.address.phone}</> : null}
              </p>
            ) : (
              <p className="muted" style={{ fontSize: 14 }}>No address on file.</p>
            )}
          </Panel>

          <Panel title="Update Status">
            <form action={updateOrderStatus}>
              <input type="hidden" name="id" value={order.id} />
              <div className="afield">
                <label>Fulfilment status</label>
                <div className="statuspick">
                  {STATUS_OPTIONS.map(([value, lab]) => (
                    <label key={value}>
                      <input type="radio" name="status" value={value} defaultChecked={order.status === value} />
                      <span className="sp">{lab}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="afield">
                <label>Tracking number</label>
                <input
                  name="trackingNumber"
                  placeholder="Add courier tracking #"
                  defaultValue={order.trackingNumber ?? ""}
                />
              </div>
              <div className="afield">
                <label>Courier</label>
                <select name="courier" defaultValue={order.courier ?? "VSK Insured Logistics"}>
                  <option>VSK Insured Logistics</option>
                  <option>Blue Dart</option>
                  <option>Delhivery</option>
                  <option>DTDC</option>
                </select>
              </div>
              <button className="btn btn--primary btn--sm" style={{ width: "100%", justifyContent: "center" }}>
                Update &amp; Log Event
              </button>
            </form>
          </Panel>

          <Panel title="Payment">
            <InfoRow k="Status" v={<Badge tone={ptone}>{plabel}</Badge>} />
            <InfoRow k="Razorpay Order" v={order.razorpayOrderId ?? "—"} />
            <InfoRow k="Razorpay Payment" v={order.razorpayPaymentId ?? "—"} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
