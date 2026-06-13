import "./returns.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { MediaImage } from "@/components/motifs/MediaImage";
import { createReturn } from "@/app/actions/returns";
import { fmtDate } from "../account/_shared";
import type { ReturnStatus } from "@prisma/client";

export const metadata = { title: "Return an Item" };

const ELIGIBLE = ["PROCESSING", "SHIPPED", "DELIVERED"] as const;

const RETURN_CHIP: Record<ReturnStatus, { bg: string; fg: string; label: string }> = {
  REQUESTED: { bg: "#FDF3DC", fg: "#A9781A", label: "Requested" },
  APPROVED: { bg: "var(--blue-wash)", fg: "var(--blue)", label: "Approved" },
  REJECTED: { bg: "var(--red-wash)", fg: "var(--red)", label: "Rejected" },
  RECEIVED: { bg: "var(--blue-wash)", fg: "var(--blue)", label: "Received" },
  REFUNDED: { bg: "#E4F7EC", fg: "#1FA855", label: "Refunded" },
};

const REASONS = [
  "Item arrived damaged",
  "Wrong item received",
  "Not as described",
  "Changed my mind",
  "Other",
];

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; submitted?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const sp = await searchParams;

  const [eligibleOrders, existingReturns] = await Promise.all([
    prisma.order.findMany({
      where: { userId, status: { in: [...ELIGIBLE] } },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.return.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { order: { select: { number: true } }, items: true },
    }),
  ]);

  const selected =
    (sp.order && eligibleOrders.find((o) => o.id === sp.order || o.number === sp.order)) || null;

  return (
    <>
      <section className="page-head">
        <svg className="page-head__rings" viewBox="0 0 420 420" fill="none">
          <circle cx="210" cy="210" r="70" stroke="#1B43C8" strokeWidth="1" />
          <circle cx="210" cy="210" r="130" stroke="#1B43C8" strokeWidth="1" strokeOpacity=".5" />
          <circle cx="210" cy="210" r="195" stroke="#1B43C8" strokeWidth="1" strokeOpacity=".28" />
        </svg>
        <div className="wrap">
          <nav className="breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/account?tab=orders">Orders</Link>
            <span className="sep">/</span>
            <span className="cur">Return an Item</span>
          </nav>
          <h1 className="ph-title">Return an Item</h1>
          <p className="ph-sub">
            {selected
              ? `From order #${selected.number}. `
              : ""}
            Unused items in original packaging can be returned within 7 days. Fired air guns are non-returnable.
          </p>
        </div>
      </section>

      <section className="section--tight" style={{ padding: "34px 0 80px" }}>
        <div className="wrap">
          {sp.submitted && (
            <div className="card card--pad" style={{ marginBottom: 26, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#E4F7EC", color: "#1FA855", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <b style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, textTransform: "uppercase", display: "block" }}>
                  Return #{sp.submitted} created
                </b>
                <span style={{ color: "var(--steel)", fontSize: 14 }}>A prepaid pickup will be scheduled to your registered address within 2 business days.</span>
              </div>
            </div>
          )}

          {/* steps */}
          <div className="co-steps">
            <div className={`co-step ${selected ? "done" : "cur"}`}><span className="co-step__no">1</span><span className="co-step__lab">Pick Order</span></div>
            <span className={`co-step__bar${selected ? " done" : ""}`} />
            <div className={`co-step ${selected ? "cur" : ""}`}><span className="co-step__no">2</span><span className="co-step__lab">Items &amp; Reason</span></div>
            <span className="co-step__bar" />
            <div className="co-step"><span className="co-step__no">3</span><span className="co-step__lab">Pickup</span></div>
          </div>

          {!selected ? (
            /* STEP 1 — pick an eligible order */
            <div className="co-block">
              <div className="co-block__head"><span className="n">1</span><h3>Select an Order to Return From</h3></div>
              <div className="co-block__body">
                {eligibleOrders.length === 0 && (
                  <p style={{ color: "var(--steel)", fontSize: 15 }}>
                    No eligible orders right now. Orders can be returned while processing, shipped or within 7 days of delivery.
                  </p>
                )}
                {eligibleOrders.map((o) => (
                  <div className="order" key={o.id} style={{ marginBottom: 14 }}>
                    <div className="order__head">
                      <span className="oid">Order <b>#{o.number}</b> · {fmtDate(o.createdAt)}</span>
                      <Link href={`/returns?order=${o.id}`} className="btn btn--primary btn--sm">Return Items</Link>
                    </div>
                    <div className="order__body" style={{ paddingTop: 14, paddingBottom: 14 }}>
                      <div style={{ flex: 1 }}>
                        <span className="mono-tag">
                          {o.items.length} item{o.items.length !== 1 ? "s" : ""} · {formatINR(o.totalInr)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* STEP 2 — items + reason + submit */
            <form action={createReturn}>
              <input type="hidden" name="orderId" value={selected.id} />
              <div className="co-grid">
                <div>
                  <div className="co-block">
                    <div className="co-block__head">
                      <span className="n">1</span><h3>Select Items to Return</h3>
                      <Link href="/returns" className="edit">Change order</Link>
                    </div>
                    <div className="co-block__body">
                      {sp.error === "noitems" && (
                        <p style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12, marginBottom: 12 }}>
                          Select at least one item to return.
                        </p>
                      )}
                      {selected.items.map((it) => (
                        <label className="cart-row" key={it.id} style={{ gridTemplateColumns: "auto 64px 1fr auto", cursor: "pointer" }}>
                          <input type="checkbox" name="items" value={it.id} className="rsel" />
                          <MediaImage alt={it.name} placeholder="Item" className="h-16 w-16 rounded-lg border border-(--line)" />
                          <div>
                            <div className="cart-row__name" style={{ fontSize: 15 }}>{it.name}</div>
                            <div className="cart-row__meta">{it.variantLabel ? `${it.variantLabel} · ` : ""}Qty {it.quantity}</div>
                          </div>
                          <div className="cart-row__price">{formatINR(it.unitPriceInr * it.quantity)}</div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="co-block">
                    <div className="co-block__head"><span className="n">2</span><h3>Reason for Return</h3></div>
                    <div className="co-block__body">
                      <div className="field" style={{ marginBottom: 16 }}>
                        <label>Why are you returning this?</label>
                        <select name="reason" required defaultValue="">
                          <option value="" disabled>Select a reason</option>
                          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label>Tell us more (optional)</label>
                        <textarea name="comment" placeholder="Add any detail that helps us process faster…" />
                      </div>
                      <div className="dropz" style={{ marginTop: 14 }}>
                        <MediaImage alt="Upload a photo of the issue (optional)" placeholder="Upload a photo of the issue (optional)" className="h-[200px] w-full rounded-lg" />
                      </div>
                    </div>
                  </div>

                  <div className="co-block">
                    <div className="co-block__head"><span className="n">3</span><h3>Preferred Resolution</h3></div>
                    <div className="co-block__body">
                      <label className="ship-opt sel">
                        <span className="radio" />
                        <div className="ship-opt__b"><b>Refund to original payment</b><span>5–7 business days after we receive the item</span></div>
                      </label>
                      <label className="ship-opt">
                        <span className="radio" />
                        <div className="ship-opt__b"><b>Replacement</b><span>Same item, shipped once approved</span></div>
                      </label>
                      <label className="ship-opt">
                        <span className="radio" />
                        <div className="ship-opt__b"><b>Store credit</b><span>Instant on approval · +5% bonus</span></div>
                      </label>
                    </div>
                  </div>
                </div>

                <aside className="summary">
                  <h3>Return Summary</h3>
                  <div className="sumline"><span>Order</span><b>#{selected.number}</b></div>
                  <div className="sumline"><span>Items in order</span><b>{selected.items.length}</b></div>
                  <div className="sumline"><span>Pickup</span><b style={{ color: "#1FA855" }}>FREE</b></div>
                  <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "14px 0" }} />
                  <p className="mono-tag" style={{ marginBottom: 16 }}>
                    A prepaid pickup will be scheduled to your registered address within 2 business days.
                  </p>
                  <button type="submit" className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }}>
                    Submit Return Request
                  </button>
                </aside>
              </div>
            </form>
          )}

          {/* existing returns */}
          {existingReturns.length > 0 && (
            <div style={{ marginTop: 44 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, textTransform: "uppercase", marginBottom: 18 }}>
                Your Returns
              </h2>
              {existingReturns.map((r) => {
                const chip = RETURN_CHIP[r.status];
                return (
                  <div className="order" key={r.id}>
                    <div className="order__head">
                      <span className="oid">
                        Return <b>#{r.rmaNumber ?? r.id.slice(0, 8)}</b> · Order #{r.order.number} · {fmtDate(r.createdAt)}
                      </span>
                      <span className="chip" style={{ background: chip.bg, color: chip.fg }}>{chip.label}</span>
                    </div>
                    <div className="order__body" style={{ paddingTop: 14, paddingBottom: 14 }}>
                      <div style={{ flex: 1 }}>
                        <b style={{ fontWeight: 600, fontSize: 14.5, display: "block" }}>
                          {r.items.map((i) => i.name).join(", ") || "—"}
                        </b>
                        <span className="mono-tag">
                          {r.reason}
                          {r.refundInr ? ` · Refund ${formatINR(r.refundInr)}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
