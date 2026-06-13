import "./dashboard.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { MediaImage } from "@/components/motifs/MediaImage";
import {
  STATUS_LABELS,
  StatusChip,
  TrackStepper,
  fmtDate,
  fmtMonthYear,
  initials,
  shortName,
  tierProgress,
} from "../_shared";

export const metadata = { title: "My Dashboard" };

const Arrow = () => (
  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.4}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const StarSvg = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3 6.3 6.9 1-5 4.8 1.2 6.9L12 17.8 5.9 21l1.2-6.9-5-4.8 6.9-1z" />
  </svg>
);

export default async function CustomerDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, orders, wishlistCount, ledger, trainingRegs, eventRegs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.wishlistItem.count({ where: { userId } }),
    prisma.rewardLedger.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.trainingRegistration.findMany({
      where: { userId, status: { in: ["PENDING", "CONFIRMED", "WAITLIST"] } },
      include: { batch: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.eventRegistration.findMany({
      where: { userId, status: { in: ["PENDING", "CONFIRMED", "WAITLIST"] } },
      include: { event: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);
  if (!user) redirect("/login");

  const points = user.loyaltyPoints;
  const tier = tierProgress(points, user.loyaltyTier);
  const activeOrder = orders.find((o) =>
    ["PAID", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY"].includes(o.status),
  );
  const inTransit = orders.filter((o) =>
    ["PAID", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY"].includes(o.status),
  ).length;

  const itemSummary = (o: (typeof orders)[number]): string => {
    if (o.items.length === 0) return "—";
    const first = o.items[0].name;
    const extra = o.items.length - 1;
    return extra > 0 ? `${first} + ${extra} item${extra > 1 ? "s" : ""}` : first;
  };

  const registrations = [
    ...trainingRegs.map((r) => ({
      id: `t-${r.id}`,
      date: r.batch.date,
      title: r.batch.title,
      meta: `${r.batch.location ?? "VSK Range"} · ${r.status === "CONFIRMED" ? "Enrolled" : r.status === "WAITLIST" ? "Waitlist" : "Registered"}`,
      href: "/training",
    })),
    ...eventRegs.map((r) => ({
      id: `e-${r.id}`,
      date: r.event.date,
      title: r.event.title,
      meta: `${r.event.location ?? "VSK"} · ${r.status === "CONFIRMED" ? "Confirmed" : r.status === "WAITLIST" ? "Waitlist" : "Registered"}`,
      href: "/events",
    })),
  ].slice(0, 4);

  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <section className="section--tight" style={{ padding: "30px 0 80px" }}>
      <div className="wrap">
        <nav className="breadcrumb" style={{ marginBottom: 18 }}>
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/account">Account</Link>
          <span className="sep">/</span>
          <span className="cur">Dashboard</span>
        </nav>

        {/* welcome banner */}
        <div className="cust-prof">
          <svg className="cust-prof__rings" viewBox="0 0 160 160" fill="none">
            <circle cx="80" cy="80" r="40" stroke="#fff" strokeWidth="1" />
            <circle cx="80" cy="80" r="64" stroke="#fff" strokeWidth="1" />
            <circle cx="80" cy="80" r="78" stroke="#fff" strokeWidth="1" />
          </svg>
          <div className="cust-prof__top">
            <span className="cust-prof__av">{initials(user.name)}</span>
            <div>
              <b>Welcome back, {shortName(user.name)}</b>
              <span className="cust-prof__tier">
                <StarSvg />
                {tier.cur.label} Member · {today}
              </span>
            </div>
          </div>
          <div className="cust-prof__bar">
            <div className="cust-prof__bartrack"><div className="cust-prof__barfill" style={{ width: `${tier.pct}%` }} /></div>
            <div className="cust-prof__barlab">
              <span>{new Intl.NumberFormat("en-IN").format(points)} pts</span>
              <span>{tier.isTop ? "Top tier unlocked" : `${new Intl.NumberFormat("en-IN").format(tier.toNext)} to ${tier.next.label}`}</span>
            </div>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="ctiles">
          <div className="ctile">
            <span className="ctile__ic blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 2l1.5 3h9L18 2M3 6h18l-1.5 13a2 2 0 01-2 2H6.5a2 2 0 01-2-2L3 6z" /></svg>
            </span>
            <div><b>{orders.length}</b><span>Total Orders</span></div>
          </div>
          <div className="ctile">
            <span className="ctile__ic green"><StarSvg /></span>
            <div><b>{new Intl.NumberFormat("en-IN").format(points)}</b><span>Reward Points</span></div>
          </div>
          <div className="ctile">
            <span className="ctile__ic red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20.8 5.6a5.5 5.5 0 00-7.8 0L12 6.6l-1-1a5.5 5.5 0 00-7.8 7.8L12 22l7.8-8.6a5.5 5.5 0 001-7.8z" /></svg>
            </span>
            <div><b>{wishlistCount}</b><span>Wishlist Items</span></div>
          </div>
          <div className="ctile">
            <span className="ctile__ic amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            </span>
            <div><b>{fmtMonthYear(user.createdAt)}</b><span>Member Since</span></div>
          </div>
        </div>

        {/* active order tracking */}
        {activeOrder && (
          <div className="cpanel" style={{ marginTop: 16 }}>
            <div className="cpanel__head">
              <h3>Active Order</h3>
              <Link href={`/orders/${activeOrder.id}`}>Track details<Arrow /></Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 22px", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
              <MediaImage alt={itemSummary(activeOrder)} placeholder="Item" className="h-[60px] w-[60px] shrink-0 rounded-lg border border-(--line)" />
              <div>
                <b style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, textTransform: "uppercase", display: "block" }}>Order #{activeOrder.number}</b>
                <span className="mono-tag">{itemSummary(activeOrder)} · {formatINR(activeOrder.totalInr)}</span>
              </div>
              <span style={{ marginLeft: "auto" }}><StatusChip status={activeOrder.status} /></span>
            </div>
            <div className="cpanel__body">
              <TrackStepper status={activeOrder.status} />
              <p className="mono-tag" style={{ textAlign: "center", marginTop: 18 }}>
                {STATUS_LABELS[activeOrder.status]}
                {activeOrder.courier ? ` · ${activeOrder.courier}` : ""}
                {activeOrder.trackingNumber ? ` · AWB ${activeOrder.trackingNumber}` : ""}
              </p>
            </div>
          </div>
        )}

        {/* recent orders + rewards activity */}
        <div className="cgrid cgrid--2">
          <div className="cpanel">
            <div className="cpanel__head">
              <h3>Recent Orders</h3>
              <Link href="/account?tab=orders">View all<Arrow /></Link>
            </div>
            <div className="cpanel__body" style={{ paddingTop: 6 }}>
              {orders.length === 0 && <p className="mono-tag" style={{ padding: "18px 0" }}>No orders yet.</p>}
              {orders.slice(0, 4).map((o) => (
                <Link href={`/orders/${o.id}`} key={o.id} className="corder" style={{ textDecoration: "none", color: "inherit" }}>
                  <span className="corder__img">
                    <MediaImage alt={itemSummary(o)} placeholder="Item" className="h-full w-full" />
                  </span>
                  <div className="corder__b">
                    <b>{itemSummary(o)}</b>
                    <span>#{o.number} · {fmtDate(o.createdAt)}</span>
                  </div>
                  <div className="corder__r">
                    <b>{formatINR(o.totalInr)}</b>
                    <StatusChip status={o.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="cpanel" style={{ background: "linear-gradient(150deg,var(--ink),var(--ink-2))", borderColor: "transparent", color: "#fff", position: "relative", overflow: "hidden" }}>
            <svg style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, opacity: 0.12 }} viewBox="0 0 220 220" fill="none">
              <circle cx="110" cy="110" r="50" stroke="#fff" strokeWidth="1" />
              <circle cx="110" cy="110" r="85" stroke="#fff" strokeWidth="1" />
              <circle cx="110" cy="110" r="108" stroke="#fff" strokeWidth="1" />
            </svg>
            <div className="cpanel__body" style={{ position: "relative", zIndex: 2 }}>
              <span className="eyebrow eyebrow--light">VSK Rewards</span>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, textTransform: "uppercase", color: "#fff", margin: "12px 0 6px", lineHeight: 1.05 }}>
                {new Intl.NumberFormat("en-IN").format(points)} points
              </h3>
              <p style={{ color: "#AEB9D2", fontSize: 14 }}>
                {tier.isTop ? (
                  <>You hold <b style={{ color: "#9DB2FF" }}>Platinum</b> — 5% off everything and priority event entry.</>
                ) : (
                  <>You&apos;re {new Intl.NumberFormat("en-IN").format(tier.toNext)} points from <b style={{ color: "#9DB2FF" }}>{tier.next.label}</b> — climb the tiers to unlock better perks.</>
                )}
              </p>
              <div className="cust-prof__bartrack" style={{ marginTop: 16, background: "rgba(255,255,255,.16)" }}>
                <div className="cust-prof__barfill" style={{ width: `${tier.pct}%` }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <Link href="/rewards" className="btn btn--light btn--sm">Redeem Points</Link>
                <Link href="/rewards" className="btn btn--ondark btn--sm">How it works</Link>
              </div>
            </div>
          </div>
        </div>

        {/* registrations + rewards activity + quick links */}
        <div className="cgrid cgrid--2">
          <div className="cpanel">
            <div className="cpanel__head">
              <h3>My Training &amp; Events</h3>
              <Link href="/training">Browse<Arrow /></Link>
            </div>
            <div className="cpanel__body" style={{ paddingTop: 6 }}>
              {registrations.length === 0 && (
                <p className="mono-tag" style={{ padding: "18px 0" }}>No upcoming registrations. Browse training batches and events.</p>
              )}
              {registrations.map((r) => {
                const [day, ...rest] = r.date.split(" ");
                return (
                  <div className="enrol" key={r.id}>
                    <div className="enrol__date"><b>{day}</b><span>{rest.join(" ") || "TBD"}</span></div>
                    <div className="enrol__b"><b>{r.title}</b><span>{r.meta}</span></div>
                    <Link href={r.href} className="btn btn--ghost btn--sm">Details</Link>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cpanel">
            <div className="cpanel__head">
              <h3>Rewards Activity</h3>
              <Link href="/rewards">All activity<Arrow /></Link>
            </div>
            <div className="cpanel__body" style={{ paddingTop: 6 }}>
              {ledger.length === 0 && <p className="mono-tag" style={{ padding: "18px 0" }}>No rewards activity yet.</p>}
              {ledger.map((l) => (
                <div className="rwrow" key={l.id}>
                  <span className="rs">
                    {l.reason}
                    <span className="rd">{fmtDate(l.createdAt)}</span>
                  </span>
                  <span className={`pts ${l.points >= 0 ? "pos" : "neg"}`}>
                    {l.points >= 0 ? "+" : ""}{new Intl.NumberFormat("en-IN").format(l.points)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* quick links */}
        <div className="cpanel" style={{ marginTop: 16 }}>
          <div className="cpanel__head"><h3>Quick Links</h3></div>
          <div className="cpanel__body">
            <div className="qlinks" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
              <Link href="/account?tab=orders">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 2l1.5 3h9L18 2M3 6h18l-1.5 13a2 2 0 01-2 2H6.5a2 2 0 01-2-2L3 6z" /></svg>
                My Orders
              </Link>
              <Link href="/wishlist">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20.8 5.6a5.5 5.5 0 00-7.8 0L12 6.6l-1-1a5.5 5.5 0 00-7.8 7.8L12 22l7.8-8.6a5.5 5.5 0 001-7.8z" /></svg>
                Wishlist
              </Link>
              <Link href="/account?tab=addr">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                Addresses
              </Link>
              <Link href="/notifications">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" /></svg>
                Notifications
              </Link>
              <Link href="/returns">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 016 6v0a6 6 0 01-6 6h-3" /></svg>
                Returns
              </Link>
              <Link href="/profile">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                Profile Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
