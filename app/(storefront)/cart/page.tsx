import Link from "next/link";
import { getCart } from "@/lib/cart";
import { computeTotals, gstLabel } from "@/lib/pricing";
import { getPricingConfig } from "@/lib/settings";
import { formatINR } from "@/lib/format";
import { CartRow } from "@/components/commerce/CartRow";
import { applyCoupon, removeCoupon } from "@/app/actions/cart";
import { checkCoupon, COUPON_MESSAGES, type CouponFailure } from "@/lib/coupons";
import { auth } from "@/lib/auth";

export const metadata = { title: "Your Cart" };

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const cart = await getCart();
  const items = cart?.items ?? [];
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.product.priceInr * i.quantity, 0);
  const pricing = await getPricingConfig();

  /**
   * Re-validate the stored code on every render rather than trusting it.
   * The cart may have changed since the code was applied — dropping below the
   * minimum spend, or the coupon expiring — and the summary must show what
   * checkout will actually charge, not what it charged when the code was typed.
   */
  const session = await auth();
  const applied = cart?.couponCode
    ? await checkCoupon(cart.couponCode, subtotal, session?.user?.id ?? null)
    : null;
  const discountInr = applied?.ok ? applied.discountInr : 0;
  const totals = computeTotals(subtotal, "standard", discountInr, pricing);

  const status = one(sp.coupon);
  const couponOk = status === "applied";
  const couponNotice =
    status === "applied"
      ? "Promo code applied."
      : status === "throttled"
        ? "Too many code attempts. Please wait a few minutes."
        : status === "invalid"
          ? COUPON_MESSAGES.NOT_FOUND
          : status === "rejected"
            ? (COUPON_MESSAGES[one(sp.reason) as CouponFailure] ?? COUPON_MESSAGES.NOT_FOUND)
            : applied && !applied.ok
              ? `${applied.message} It will not be applied at checkout.`
              : "";

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
                <div className="sumline"><span>{gstLabel(pricing)}</span><b>{formatINR(totals.gstInr)}</b></div>
                {totals.discountInr > 0 ? (
                  <div className="sumline">
                    <span>Discount ({cart?.couponCode})</span>
                    <b style={{ color: "#1FA855" }}>&minus;{formatINR(totals.discountInr)}</b>
                  </div>
                ) : null}
                <div className="sumtotal"><span>Total</span><b>{formatINR(totals.totalInr)}</b></div>

                {/*
                  Promo code. This input used to exist but posted nowhere — it
                  was removed as dead UI during the audit. It is back now that
                  applyCoupon actually redeems against a Coupon row.
                */}
                <div className="promo" style={{ margin: "14px 0 6px" }}>
                  {cart?.couponCode && totals.discountInr > 0 ? (
                    <form action={removeCoupon}>
                      <p className="mono-tag" style={{ margin: "0 0 6px" }}>
                        Code <b>{cart.couponCode}</b> applied
                      </p>
                      <button type="submit" className="btn btn--ghost" style={{ width: "100%" }}>
                        Remove code
                      </button>
                    </form>
                  ) : (
                    <form
                      action={async (fd: FormData) => {
                        "use server";
                        await applyCoupon(String(fd.get("code") ?? ""));
                      }}
                      style={{ display: "flex", gap: 8 }}
                    >
                      <label htmlFor="promo-code" className="sr-only">
                        Promo code
                      </label>
                      <input
                        id="promo-code"
                        name="code"
                        placeholder="Promo code"
                        autoComplete="off"
                        maxLength={64}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <button type="submit" className="btn btn--ghost">
                        Apply
                      </button>
                    </form>
                  )}
                  {couponNotice ? (
                    <p
                      role="status"
                      className="mono-tag"
                      style={{ margin: "8px 0 0", color: couponOk ? "#1FA855" : "#b3261e" }}
                    >
                      {couponNotice}
                    </p>
                  ) : null}
                </div>
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
