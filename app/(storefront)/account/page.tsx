import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { MediaImage } from "@/components/motifs/MediaImage";
import {
  addAddressFromForm,
  deleteAddress,
  logout,
  setDefaultAddress,
} from "@/app/actions/account";
import {
  StatusChip,
  TrackStepper,
  fmtDate,
  initials,
  shortName,
} from "./_shared";

export const metadata = { title: "My Account" };

const TABS = ["dash", "orders", "addr", "dl"] as const;
type Tab = (typeof TABS)[number];

const MenuIcons = {
  dash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 2l1.5 3h9L18 2M3 6h18l-1.5 13a2 2 0 01-2 2H6.5a2 2 0 01-2-2L3 6z" />
    </svg>
  ),
  wishlist: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20.8 5.6a5.5 5.5 0 00-7.8 0L12 6.6l-1-1a5.5 5.5 0 00-7.8 7.8L12 22l7.8-8.6a5.5 5.5 0 001-7.8z" />
    </svg>
  ),
  addr: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  dl: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
};

const panelTitle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 800,
  fontSize: 20,
  textTransform: "uppercase",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "dash";

  const [user, orders, addresses, wishlistCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        events: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
    prisma.wishlistItem.count({ where: { userId } }),
  ]);

  const latest = orders[0];
  const inTransit = orders.filter((o) =>
    ["PAID", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY"].includes(o.status),
  ).length;
  const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");

  const itemSummary = (o: (typeof orders)[number]): string => {
    if (o.items.length === 0) return "—";
    const first = o.items[0].name;
    const extra = o.items.length - 1;
    return extra > 0 ? `${first} + ${extra} item${extra > 1 ? "s" : ""}` : `${first}${o.items[0].quantity > 1 ? ` ×${o.items[0].quantity}` : ""}`;
  };

  return (
    <>
      <section className="page-head" style={{ paddingBottom: 0 }}>
        <div className="wrap" style={{ paddingBottom: 30 }}>
          <nav className="breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <span className="cur">My Account</span>
          </nav>
          <h1 className="ph-title">My Account</h1>
        </div>
      </section>

      <section className="section--tight" style={{ padding: "34px 0 80px" }}>
        <div className="wrap">
          <div className="acct">
            {/* SIDE */}
            <aside className="acct__side">
              <div className="acct__user">
                <span className="acct__av">{initials(user?.name)}</span>
                <div>
                  <b>{shortName(user?.name)}</b>
                  <span>Member since {user ? user.createdAt.getFullYear() : "—"}</span>
                </div>
              </div>
              <nav className="acct__menu">
                <Link href="/account?tab=dash" className={tab === "dash" ? "active" : undefined}>{MenuIcons.dash}Overview</Link>
                <Link href="/account?tab=orders" className={tab === "orders" ? "active" : undefined}>{MenuIcons.orders}Orders</Link>
                <Link href="/wishlist">{MenuIcons.wishlist}Wishlist</Link>
                <Link href="/account?tab=addr" className={tab === "addr" ? "active" : undefined}>{MenuIcons.addr}Addresses</Link>
                <Link href="/account?tab=dl" className={tab === "dl" ? "active" : undefined}>{MenuIcons.dl}Downloads</Link>
                <Link href="/profile">{MenuIcons.settings}Settings</Link>
                <form action={logout} style={{ display: "contents" }}>
                  <button
                    type="submit"
                    style={{ all: "unset", display: "flex", alignItems: "center", gap: 12, padding: "13px 22px", fontWeight: 600, fontSize: 14.5, color: "var(--ink-2)", borderLeft: "3px solid transparent", cursor: "pointer", width: "calc(100% - 47px)" }}
                  >
                    {MenuIcons.logout}Logout
                  </button>
                </form>
              </nav>
            </aside>

            {/* CONTENT */}
            <div>
              {tab === "dash" && (
                <div className="tabpanel active">
                  <div className="statrow" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 24 }}>
                    <div className="stat"><b>{orders.length}</b><span>Total Orders</span></div>
                    <div className="stat"><b>{inTransit}</b><span>In Transit</span></div>
                    <div className="stat"><b>{wishlistCount}</b><span>Wishlist Items</span></div>
                  </div>
                  {latest ? (
                    <div className="card card--pad">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                        <b style={panelTitle}>Latest Order</b>
                        <StatusChip status={latest.status} />
                      </div>
                      <TrackStepper status={latest.status} />
                      <p className="mono-tag" style={{ marginTop: 20, textAlign: "center" }}>
                        Order #{latest.number} · Placed {fmtDate(latest.createdAt)}
                        {latest.courier ? ` · ${latest.courier}` : ""}
                      </p>
                    </div>
                  ) : (
                    <div className="card card--pad" style={{ textAlign: "center", color: "var(--steel)" }}>
                      No orders yet. <Link href="/shop" style={{ color: "var(--blue)", fontWeight: 600 }}>Browse the shop</Link> to get started.
                    </div>
                  )}
                </div>
              )}

              {tab === "orders" && (
                <div className="tabpanel active">
                  {orders.length === 0 && (
                    <div className="card card--pad" style={{ textAlign: "center", color: "var(--steel)" }}>
                      No orders yet. <Link href="/shop" style={{ color: "var(--blue)", fontWeight: 600 }}>Browse the shop</Link>.
                    </div>
                  )}
                  {orders.map((o, i) => {
                    const live = ["PAID", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY"].includes(o.status);
                    return (
                      <div className="order" key={o.id}>
                        <div className="order__head">
                          <span className="oid">Order <b>#{o.number}</b> · {fmtDate(o.createdAt)}</span>
                          <StatusChip status={o.status} />
                        </div>
                        <div className="order__body">
                          <MediaImage alt={itemSummary(o)} placeholder="Item" className="h-16 w-16 shrink-0 rounded-lg border border-(--line)" />
                          <div style={{ flex: 1 }}>
                            <b style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", fontSize: 17, display: "block" }}>
                              {itemSummary(o)}
                            </b>
                            <span className="mono-tag">Total {formatINR(o.totalInr)}{o.paymentStatus === "PAID" ? " · GST invoice available" : ""}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Link href={`/orders/${o.id}`} className="btn btn--ghost btn--sm">Invoice</Link>
                            {live ? (
                              <Link href={`/orders/${o.id}`} className="btn btn--primary btn--sm">Track</Link>
                            ) : (
                              <>
                                <Link href={`/reviews/write?order=${o.number}`} className="btn btn--ghost btn--sm">Review</Link>
                                <Link href={`/returns?order=${o.id}`} className="btn btn--ghost btn--sm">Return</Link>
                                <Link href={`/orders/${o.id}`} className="btn btn--primary btn--sm">Details</Link>
                              </>
                            )}
                          </div>
                        </div>
                        {i === 0 && (
                          <div style={{ padding: "0 20px 20px" }}>
                            <TrackStepper status={o.status} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "addr" && (
                <div className="tabpanel active">
                  {addresses.length > 0 ? (
                    <div className="split2" style={{ gap: 18, alignItems: "start" }}>
                      {addresses.map((a) => (
                        <div key={a.id} className="card card--pad" style={a.isDefault ? { border: "2px solid var(--blue)" } : undefined}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            {a.isDefault ? (
                              <span className="chip chip--new">Default</span>
                            ) : (
                              <form action={setDefaultAddress}>
                                <input type="hidden" name="id" value={a.id} />
                                <button type="submit" className="mono-tag" style={{ all: "unset", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--blue)", cursor: "pointer" }}>
                                  Set default
                                </button>
                              </form>
                            )}
                            <form action={deleteAddress}>
                              <input type="hidden" name="id" value={a.id} />
                              <button type="submit" className="mono-tag" style={{ all: "unset", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--red)", cursor: "pointer" }}>
                                Delete
                              </button>
                            </form>
                          </div>
                          <b style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>{a.name}</b>
                          <p style={{ color: "var(--steel)", fontSize: 15, marginTop: 8 }}>
                            {a.line1}{a.line2 ? <>, {a.line2}</> : null}<br />
                            {a.city} {a.pincode}<br />
                            {a.state}{a.phone ? ` · ${a.phone}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card card--pad" style={{ textAlign: "center", color: "var(--steel)", marginBottom: 18 }}>
                      No saved addresses yet.
                    </div>
                  )}

                  <div className="card card--pad" style={{ marginTop: 18 }}>
                    <b style={{ ...panelTitle, display: "block", marginBottom: 16 }}>Add New Address</b>
                    <form action={addAddressFromForm}>
                      <div className="form-grid">
                        <div className="field"><label>Full name <span className="req">*</span></label><input name="name" required /></div>
                        <div className="field"><label>Phone <span className="req">*</span></label><input name="phone" required placeholder="+91" /></div>
                        <div className="field field--full"><label>Address line 1 <span className="req">*</span></label><input name="line1" required /></div>
                        <div className="field field--full"><label>Address line 2</label><input name="line2" /></div>
                        <div className="field"><label>City <span className="req">*</span></label><input name="city" required /></div>
                        <div className="field"><label>State <span className="req">*</span></label><input name="state" required /></div>
                        <div className="field"><label>PIN code <span className="req">*</span></label><input name="pincode" required /></div>
                      </div>
                      <button type="submit" className="btn btn--primary btn--sm" style={{ marginTop: 18 }}>
                        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
                        Add New Address
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {tab === "dl" && (
                <div className="tabpanel active">
                  <div className="card" style={{ overflow: "hidden" }}>
                    {paidOrders.length === 0 && (
                      <div style={{ padding: 50, textAlign: "center", color: "var(--mute)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                        GST invoices appear here once an order is paid.
                      </div>
                    )}
                    {paidOrders.map((o, i) => (
                      <div
                        key={o.id}
                        className="order__head"
                        style={i === 0 ? undefined : { background: "#fff", ...(i === paidOrders.length - 1 ? { borderBottom: "none" } : {}) }}
                      >
                        <span className="oid">GST Invoice <b>#INV-{o.number.replace("VSK-", "")}</b> · {fmtDate(o.createdAt)} · {formatINR(o.totalInr)}</span>
                        <Link href={`/orders/${o.id}`} className="btn btn--ghost btn--sm">Download PDF</Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
