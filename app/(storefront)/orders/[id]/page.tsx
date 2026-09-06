import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { gstLabelForOrder } from "@/lib/pricing";
import { MediaImage } from "@/components/motifs/MediaImage";
import { STATUS_LABELS, StatusChip, TrackStepper, fmtDate } from "../../account/_shared";

export const metadata = { title: "Order Details" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  // Ownership check — id AND userId, never the client id alone.
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: {
      items: { include: { product: { select: { slug: true, brand: { select: { name: true } } } } } },
      address: true,
      events: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const latestEvent = order.events[order.events.length - 1];
  const statusColor =
    order.status === "DELIVERED" || order.status === "OUT_FOR_DELIVERY"
      ? "#1FA855"
      : order.status === "CANCELLED" || order.status === "RETURNED"
        ? "var(--red)"
        : "var(--blue)";

  return (
    <>
      <div className="wrap" style={{ paddingTop: 26 }}>
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/account?tab=orders">My Orders</Link>
          <span className="sep">/</span>
          <span className="cur">#{order.number}</span>
        </nav>
      </div>

      <section className="section--tight" style={{ padding: "24px 0 80px" }}>
        <div className="wrap">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(30px,4vw,44px)", textTransform: "uppercase", letterSpacing: "-.01em", lineHeight: 1 }}>
                Order #{order.number}
              </h1>
              <p style={{ color: "var(--steel)", marginTop: 8 }}>
                Placed {fmtDate(order.createdAt)} ·{" "}
                <span style={{ color: statusColor, fontWeight: 600 }}>{STATUS_LABELS[order.status]}</span>
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href={`/returns?order=${order.id}`} className="btn btn--ghost btn--sm">Return Items</Link>
              <Link href={`/reviews/write?order=${order.number}`} className="btn btn--ghost btn--sm">Write Review</Link>
              <Link href="/help" className="btn btn--ghost btn--sm">Need Help?</Link>
            </div>
          </div>

          {/* tracking */}
          <div className="card card--pad" style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
              <b style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, textTransform: "uppercase" }}>Tracking</b>
              <StatusChip status={order.status} />
            </div>
            <TrackStepper status={order.status} />
            <p className="mono-tag" style={{ textAlign: "center", marginTop: 18 }}>
              {latestEvent?.note ?? STATUS_LABELS[order.status]}
              {order.courier ? ` · ${order.courier}` : ""}
              {order.trackingNumber ? ` · AWB ${order.trackingNumber}` : ""}
            </p>
            {order.events.length > 0 && (
              <div style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                {order.events.map((e) => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                    <span style={{ color: "var(--ink-2)" }}>
                      <b style={{ fontWeight: 600 }}>{STATUS_LABELS[e.status]}</b>
                      {e.note ? <span style={{ color: "var(--steel)" }}> — {e.note}</span> : null}
                    </span>
                    <span className="mono-tag" style={{ whiteSpace: "nowrap" }}>{fmtDate(e.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cartwrap">
            {/* items */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
                <b style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, textTransform: "uppercase" }}>
                  Items · {order.items.length}
                </b>
              </div>
              <div style={{ padding: "0 22px" }}>
                {order.items.map((it) => (
                  <div className="cart-row" key={it.id} style={{ gridTemplateColumns: "72px 1fr auto" }}>
                    <MediaImage
                      alt={it.name}
                      placeholder={it.product?.brand?.name ?? "Item"}
                      className="h-[72px] w-[72px] rounded-lg border border-(--line)"
                    />
                    <div>
                      <div className="cart-row__brand">{it.product?.brand?.name ?? "VSK"}</div>
                      <div className="cart-row__name" style={{ fontSize: 16 }}>{it.name}</div>
                      <div className="cart-row__meta">
                        {it.variantLabel ? `${it.variantLabel} · ` : ""}Qty {it.quantity}
                      </div>
                    </div>
                    <div className="cart-row__right">
                      <div className="cart-row__price">{formatINR(it.unitPriceInr * it.quantity)}</div>
                      {it.product?.slug && (
                        <Link href={`/product/${it.product.slug}`} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)", letterSpacing: ".06em" }}>
                          Buy again
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* summary */}
            <aside className="summary">
              <h3>Summary</h3>
              <div className="sumline"><span>Subtotal</span><b>{formatINR(order.subtotalInr)}</b></div>
              <div className="sumline">
                <span>Shipping</span>
                {order.shippingInr === 0 ? <b style={{ color: "#1FA855" }}>FREE</b> : <b>{formatINR(order.shippingInr)}</b>}
              </div>
              <div className="sumline"><span>{gstLabelForOrder(order.subtotalInr, order.gstInr)}</span><b>{formatINR(order.gstInr)}</b></div>
              {order.discountInr > 0 && (
                <div className="sumline"><span>Discount</span><b style={{ color: "#1FA855" }}>-{formatINR(order.discountInr)}</b></div>
              )}
              <div className="sumtotal"><span>Total {order.paymentStatus === "PAID" ? "Paid" : ""}</span><b>{formatINR(order.totalInr)}</b></div>
              <p className="mono-tag" style={{ margin: "8px 0 18px" }}>
                {order.paymentStatus === "PAID" ? `Paid · ${fmtDate(order.updatedAt)}` : `Payment ${order.paymentStatus.toLowerCase()}`}
              </p>
              <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "0 0 18px" }} />
              <b style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", fontSize: 14, display: "block", marginBottom: 8 }}>
                Delivery Address
              </b>
              {order.address ? (
                <p style={{ fontSize: 14, color: "var(--steel)", lineHeight: 1.6 }}>
                  {order.address.name}<br />
                  {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city} {order.address.pincode}<br />
                  {order.address.state}{order.address.phone ? ` · ${order.address.phone}` : ""}
                </p>
              ) : (
                <p style={{ fontSize: 14, color: "var(--steel)" }}>No address on file.</p>
              )}
              {order.paymentStatus === "PAID" && (
                <a href="#" className="btn btn--ghost btn--sm" style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
                  Download GST Invoice
                </a>
              )}
              {order.documents.length > 0 && (
                <>
                  <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "18px 0" }} />
                  <b style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", fontSize: 14, display: "block", marginBottom: 8 }}>
                    Documents
                  </b>
                  <ul style={{ display: "grid", gap: 8 }}>
                    {order.documents.map((doc) => (
                      <li key={doc.id}>
                        <a
                          href={`/api/files/${doc.fileId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 14, fontWeight: 600, color: "var(--blue)" }}
                        >
                          {doc.label ?? doc.docType ?? "Document"}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
