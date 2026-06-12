import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/storefront/PageHeader";
import { DealerNav } from "../DealerNav";
import { requireDealerPage, getCreditUsed, getDealerProfile } from "../data";

export const metadata = { title: "Invoices & Credit" };

export default async function DealerInvoicesPage() {
  const { userId } = await requireDealerPage();

  const [profile, creditUsed, orders] = await Promise.all([
    getDealerProfile(userId),
    getCreditUsed(userId),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
  ]);

  const creditLimit = profile?.creditLimitInr ?? null;

  return (
    <>
      <PageHeader
        dark
        title="Invoices & Credit"
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Dealer Portal", href: "/dealer" },
          { label: "Invoices" },
        ]}
        sub={
          creditLimit != null
            ? `${formatINR(creditUsed)} of your ${formatINR(creditLimit)} credit line is in use across open orders.`
            : "All invoices for your wholesale orders."
        }
        actions={<DealerNav active="/dealer/invoices" />}
      />

      <section className="section--tight" style={{ padding: "34px 0 64px" }}>
        <div className="wrap">
          <div className="cpanel">
            <div className="cpanel__head">
              <h3>Invoices</h3>
              <Link href="/dealer/order">
                New bulk order
                <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </div>
            <div className="cpanel__body dwrap" style={{ paddingTop: 8 }}>
              {orders.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--steel)", padding: "14px 0" }}>
                  No invoices yet — your bulk orders will appear here.
                </p>
              ) : (
                <table className="dtable">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th style={{ textAlign: "right" }}>Total (incl. GST)</th>
                      <th style={{ textAlign: "right" }}>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>INV-{o.number}</span>
                        </td>
                        <td className="mono">
                          {o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="mono">
                          {o.items.reduce((s, i) => s + i.quantity, 0)} units · {o.items.length} lines
                        </td>
                        <td className="num">
                          {formatINR(o.totalInr)}
                          <span style={{ display: "block", fontFamily: "var(--font-mono)", fontWeight: 400, fontSize: 10, color: "var(--mute)" }}>
                            incl. GST 18% {formatINR(o.gstInr)}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {o.paymentStatus === "PAID" ? (
                            <span className="chip" style={{ background: "#E4F7EC", color: "#1FA855", borderColor: "transparent" }}>Paid</span>
                          ) : o.paymentStatus === "REFUNDED" ? (
                            <span className="chip" style={{ background: "var(--blue-wash)", color: "var(--blue)", borderColor: "transparent" }}>Refunded</span>
                          ) : (
                            <span className="chip" style={{ background: "#FDF3DC", color: "#A9781A", borderColor: "transparent" }}>
                              {o.paymentStatus === "FAILED" ? "Failed" : "Due"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)", marginTop: 14, lineHeight: 1.7 }}>
            All amounts include GST at 18% on the goods subtotal. GST invoices are issued against
            GSTIN {profile?.gstNumber ?? "on file"} at dispatch. Credit terms per your dealer
            agreement{profile?.territory ? ` · territory: ${profile.territory}` : ""}.
          </p>
        </div>
      </section>
    </>
  );
}
