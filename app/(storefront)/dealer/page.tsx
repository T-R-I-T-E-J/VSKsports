import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/storefront/PageHeader";
import { DealerNav } from "./DealerNav";
import {
  requireDealerPage,
  getCreditUsed,
  getDealerProfile,
  getWholesaleProducts,
  getReorderSuggestions,
} from "./data";

export const metadata = { title: "Dealer Dashboard" };

const ph = (s: string) => s.slice(0, 3).toUpperCase();

function StatusChip({ status }: { status: string }) {
  const good = ["PAID", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status);
  const style = good
    ? { background: "#E4F7EC", color: "#1FA855", borderColor: "transparent" }
    : { background: "#FDF3DC", color: "#A9781A", borderColor: "transparent" };
  return (
    <span className="chip" style={style}>
      {status.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}
    </span>
  );
}

export default async function DealerDashboardPage() {
  const { userId } = await requireDealerPage();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [profile, creditUsed, ordersThisMonth, recentOrders, products, reorder] =
    await Promise.all([
      getDealerProfile(userId),
      getCreditUsed(userId),
      prisma.order.count({ where: { userId, createdAt: { gte: monthStart } } }),
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { items: true },
      }),
      getWholesaleProducts(),
      getReorderSuggestions(userId),
    ]);

  const businessName = profile?.businessName ?? "Dealer Account";
  const marginPct = profile?.marginPct ?? 30;
  const creditLimit = profile?.creditLimitInr ?? null;
  const creditPct = creditLimit ? Math.min(100, Math.round((creditUsed / creditLimit) * 100)) : 0;

  return (
    <>
      <PageHeader
        dark
        title="Dealer Dashboard"
        crumbs={[{ label: "Home", href: "/" }, { label: "Dealer Portal" }]}
        sub={`Welcome back, ${businessName}.`}
        actions={
          <>
            <span className="chip" style={{ background: "#FDF3DC", color: "#A9781A", borderColor: "transparent" }}>
              ★ {profile?.tier ?? "STANDARD"} Dealer
            </span>
            <span className="chip" style={{ background: "#E4F7EC", color: "#1FA855", borderColor: "transparent" }}>
              {marginPct}% dealer margin
            </span>
            <DealerNav active="/dealer" />
          </>
        }
      />

      <section className="section--tight" style={{ padding: "34px 0 64px" }}>
        <div className="wrap">
          {/* KPI tiles */}
          <div className="ctiles">
            <div className="ctile">
              <span className="ctile__ic blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
              </span>
              <div>
                <b>{creditLimit != null ? formatINR(creditLimit) : "—"}</b>
                <span>Credit Limit</span>
              </div>
            </div>
            <div className="ctile">
              <span className="ctile__ic red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
              </span>
              <div>
                <b>{formatINR(creditUsed)}</b>
                <span>Credit Used</span>
              </div>
            </div>
            <div className="ctile">
              <span className="ctile__ic green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 2l1.5 3h9L18 2M3 6h18l-1.5 13a2 2 0 01-2 2H6.5a2 2 0 01-2-2L3 6z" /></svg>
              </span>
              <div>
                <b>{ordersThisMonth}</b>
                <span>Orders This Month</span>
              </div>
            </div>
            <div className="ctile">
              <span className="ctile__ic amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z" /></svg>
              </span>
              <div>
                <b>{marginPct}%</b>
                <span>Dealer Margin</span>
              </div>
            </div>
          </div>

          {/* recent orders + tier panel */}
          <div className="cgrid cgrid--2">
            <div className="cpanel">
              <div className="cpanel__head">
                <h3>Recent Bulk Orders</h3>
                <Link href="/dealer/invoices">
                  View all
                  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              </div>
              <div className="cpanel__body" style={{ paddingTop: 6 }}>
                {recentOrders.length === 0 && (
                  <p style={{ fontSize: 14, color: "var(--steel)", padding: "14px 0" }}>
                    No orders yet — place your first bulk order to get started.
                  </p>
                )}
                {recentOrders.map((o) => {
                  const first = o.items[0];
                  const label = first
                    ? `${first.quantity}× ${first.name}${o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""}`
                    : "Bulk order";
                  return (
                    <div className="corder" key={o.id}>
                      <span className="corder__ph">{ph(first?.name ?? "VSK")}</span>
                      <div className="corder__b">
                        <b>{label}</b>
                        <span>
                          #{o.number} · {o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <div className="corder__r">
                        <b>{formatINR(o.totalInr)}</b>
                        <StatusChip status={o.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="cpanel"
              style={{
                background: "linear-gradient(150deg,var(--blue-ink),var(--blue))",
                borderColor: "transparent",
                color: "#fff",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <svg style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, opacity: 0.14 }} viewBox="0 0 220 220" fill="none">
                <circle cx="110" cy="110" r="50" stroke="#fff" strokeWidth="1" />
                <circle cx="110" cy="110" r="85" stroke="#fff" strokeWidth="1" />
                <circle cx="110" cy="110" r="108" stroke="#fff" strokeWidth="1" />
              </svg>
              <div className="cpanel__body" style={{ position: "relative", zIndex: 2 }}>
                <span className="eyebrow eyebrow--light">Dealer Pricing · {profile?.tier ?? "STANDARD"} Tier</span>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 30, textTransform: "uppercase", color: "#fff", margin: "12px 0 8px", lineHeight: 1.05 }}>
                  {marginPct}% off MRP
                </h3>
                <p style={{ color: "#C5D2F5", fontSize: 14 }}>
                  Wholesale pricing across the full VSK range. Order on credit and settle against invoices.
                </p>
                {creditLimit != null && (
                  <>
                    <div className="dprog__track" style={{ marginTop: 16 }}>
                      <div className="dprog__fill" style={{ width: `${creditPct}%` }} />
                    </div>
                    <div className="dprog__lab">
                      <span>{formatINR(creditUsed)} credit used</span>
                      <span>{formatINR(Math.max(0, creditLimit - creditUsed))} available</span>
                    </div>
                  </>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <Link href="/dealer/order" className="btn btn--light btn--sm">Order Stock</Link>
                  <a href="#pricelist" className="btn btn--ondark btn--sm">Price List</a>
                </div>
              </div>
            </div>
          </div>

          {/* quick reorder + invoices */}
          <div className="cgrid cgrid--2">
            <div className="cpanel">
              <div className="cpanel__head">
                <h3>Quick Reorder</h3>
                <Link href="/dealer/order">
                  Bulk order
                  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              </div>
              <div className="cpanel__body">
                <div className="crecs">
                  {reorder.length === 0 && (
                    <p style={{ fontSize: 14, color: "var(--steel)" }}>
                      Your most-ordered products will appear here after your first bulk order.
                    </p>
                  )}
                  {reorder.map(({ product, totalQty }) => (
                    <div className="crec" key={product.id}>
                      <span className="crec__ph">{ph(product.brand?.name ?? product.name)}</span>
                      <div className="crec__b">
                        <span className="br">{product.brand?.name ?? "VSK"} · {totalQty} ordered</span>
                        <b>{product.name}</b>
                        <span className="pr">{formatINR(product.dealerPriceInr ?? 0)} /unit</span>
                      </div>
                      <Link href="/dealer/order" className="crec__add" aria-label={`Reorder ${product.name}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="cpanel">
              <div className="cpanel__head">
                <h3>Invoices &amp; Credit</h3>
                <Link href="/dealer/invoices">
                  All
                  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              </div>
              <div className="cpanel__body" style={{ paddingTop: 8 }}>
                {recentOrders.length === 0 && (
                  <p style={{ fontSize: 14, color: "var(--steel)", padding: "14px 0" }}>No invoices yet.</p>
                )}
                {recentOrders.slice(0, 3).map((o) => (
                  <div className="corder" key={o.id} style={{ gridTemplateColumns: "1fr auto" }}>
                    <div className="corder__b">
                      <b style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>INV-{o.number}</b>
                      <span>{o.paymentStatus === "PAID" ? "Paid" : "Payment pending"}</span>
                    </div>
                    <div className="corder__r">
                      <b style={{ fontSize: 15 }}>{formatINR(o.totalInr)}</b>
                      <Link href="/dealer/invoices" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)" }}>
                        View invoice
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* wholesale price list */}
          <div className="cpanel" id="pricelist" style={{ marginTop: 16 }}>
            <div className="cpanel__head">
              <h3>Wholesale Price List</h3>
              <Link href="/dealer/order">
                Start bulk order
                <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </div>
            <div className="cpanel__body dwrap" style={{ paddingTop: 8 }}>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: "right" }}>Retail (MRP)</th>
                    <th style={{ textAlign: "right" }}>Dealer Price</th>
                    <th style={{ textAlign: "right" }}>Your Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((pr) => {
                    const margin = pr.dealerPriceInr
                      ? Math.round(((pr.priceInr - pr.dealerPriceInr) / pr.priceInr) * 100)
                      : 0;
                    return (
                      <tr key={pr.id}>
                        <td className="pname">
                          <span>{pr.brand?.name ?? "VSK"}</span>
                          <b>{pr.name}</b>
                        </td>
                        <td className="num" style={{ fontWeight: 600, color: "var(--steel)" }}>{formatINR(pr.priceInr)}</td>
                        <td className="num">{formatINR(pr.dealerPriceInr ?? 0)}</td>
                        <td style={{ textAlign: "right" }}><span className="dmargin">{margin}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
