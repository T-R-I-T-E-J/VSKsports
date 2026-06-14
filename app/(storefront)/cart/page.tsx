import Link from "next/link";
import { getCart } from "@/lib/cart";
import { computeTotals, GST_LABEL } from "@/lib/pricing";
import { formatINR } from "@/lib/format";
import { CartRow } from "@/components/commerce/CartRow";

export const metadata = { title: "Your Cart" };

export default async function CartPage() {
  const cart = await getCart();
  const items = cart?.items ?? [];
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.product.priceInr * i.quantity, 0);
  const totals = computeTotals(subtotal, "standard");

  return (
    <>
      <div className="wrap" style={{ paddingTop: 26 }}>
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/shop">Shop</Link>
          <span className="sep">/</span>
          <span className="cur">Cart</span>
        </nav>
      </div>

      <section className="section--tight" style={{ padding: "24px 0 80px" }}>
        <div className="wrap">
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(32px,4vw,46px)", textTransform: "uppercase", letterSpacing: "-.01em", margin: "0 0 26px" }}>
            Your Cart{" "}
            {count > 0 && (
              <span style={{ color: "var(--mute)", fontWeight: 600 }}>
                · {count} item{count !== 1 ? "s" : ""}
              </span>
            )}
          </h1>

          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--paper-3)", color: "var(--mute)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
                <svg viewBox="0 0 24 24" width={38} height={38} fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <circle cx="9" cy="21" r="1.5" />
                  <circle cx="18" cy="21" r="1.5" />
                  <path d="M2 3h3l2.4 12.4a2 2 0 002 1.6h8.7a2 2 0 002-1.6L23 7H6" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, textTransform: "uppercase" }}>
                Your cart is empty
              </h3>
              <p style={{ color: "var(--steel)", margin: "10px 0 22px" }}>
                Add some gear and it&apos;ll show up here.
              </p>
              <Link href="/shop" className="btn btn--primary">Browse Shop</Link>
            </div>
          ) : (
            <div className="cartwrap">
              <div>
                <div className="cartlist">
                  {items.map((i) => (
                    <CartRow
                      key={i.id}
                      item={{
                        id: i.id,
                        name: i.product.name,
                        brand: i.product.brand?.name ?? null,
                        variantLabel: i.variantLabel || null,
                        priceInr: i.product.priceInr,
                        quantity: i.quantity,
                      }}
                    />
                  ))}
                </div>
                <Link href="/shop" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 18, fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", color: "var(--blue)" }}>
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4}>
                    <path d="M19 12H5M11 18l-6-6 6-6" />
                  </svg>
                  Continue Shopping
                </Link>
              </div>

              <aside className="summary">
                <h3>Order Summary</h3>
                <div className="sumline"><span>Subtotal</span><b>{formatINR(totals.subtotalInr)}</b></div>
                <div className="sumline">
                  <span>Shipping (insured)</span>
                  <b style={totals.shippingInr === 0 ? { color: "#1FA855" } : undefined}>
                    {totals.shippingInr === 0 ? "FREE" : formatINR(totals.shippingInr)}
                  </b>
                </div>
                <div className="sumline"><span>{GST_LABEL}</span><b>{formatINR(totals.gstInr)}</b></div>
                <div className="promo">
                  <input placeholder="Promo code" />
                  <button className="btn btn--ghost btn--sm">Apply</button>
                </div>
                <div className="sumtotal"><span>Total</span><b>{formatINR(totals.totalInr)}</b></div>
                <p className="mono-tag" style={{ margin: "8px 0 18px" }}>
                  Inclusive of all taxes · GST invoice provided
                </p>
                <Link href="/checkout" className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }}>
                  Proceed to Checkout
                </Link>
                <div className="pdp__trust" style={{ marginTop: 18, background: "var(--paper-2)" }}>
                  <div className="tl">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                    Secure checkout · UPI, Cards, Netbanking
                  </div>
                  <div className="tl">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
                    100% genuine &amp; GST billed
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
