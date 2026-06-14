"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeTotals, GST_LABEL, type ShippingMethod } from "@/lib/pricing";
import { formatINR } from "@/lib/format";
import { MediaImage } from "@/components/motifs/MediaImage";
import { startCheckout, confirmMockPayment, confirmRazorpayPayment } from "@/app/actions/checkout";
import { addAddress } from "@/app/actions/address";

type Addr = {
  id: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string | null;
  isDefault: boolean;
};
type Mini = { name: string; meta: string; priceInr: number };

const SHIPPING: { id: ShippingMethod; title: string; sub: string }[] = [
  { id: "standard", title: "VSK Insured · Standard", sub: "5–7 business days · fully insured" },
  { id: "express", title: "Express Delivery", sub: "2–3 business days · priority handling" },
  { id: "pickup", title: "Store Pickup", sub: "Collect from VSK HQ, Mumbai" },
];
const PAYMENTS = [
  { id: "upi", title: "UPI", sub: "GPay, PhonePe, Paytm & more", logos: ["UPI"] },
  { id: "card", title: "Credit / Debit Card", sub: "Visa, Mastercard, RuPay", logos: ["VISA", "MC", "RUPAY"] },
  { id: "netbanking", title: "Net Banking", sub: "All major banks", logos: ["NB"] },
  { id: "emi", title: "EMI", sub: "No-cost EMI on orders above ₹10,000", logos: ["EMI"] },
];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export function CheckoutFlow({
  addresses,
  items,
  subtotalInr,
  razorpayEnabled,
  user,
}: {
  addresses: Addr[];
  items: Mini[];
  subtotalInr: number;
  razorpayEnabled: boolean;
  user: { name: string; email: string };
}) {
  const router = useRouter();
  const [addressId, setAddressId] = useState(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "",
  );
  const [shipping, setShipping] = useState<ShippingMethod>("standard");
  const [payment, setPayment] = useState("upi");
  const [showAdd, setShowAdd] = useState(addresses.length === 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = computeTotals(subtotalInr, shipping);

  async function saveAddress(form: FormData) {
    const input = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      line1: String(form.get("line1") ?? ""),
      line2: String(form.get("line2") ?? ""),
      city: String(form.get("city") ?? ""),
      state: String(form.get("state") ?? ""),
      pincode: String(form.get("pincode") ?? ""),
    };
    const res = await addAddress(input);
    setAddressId(res.id);
    setShowAdd(false);
    router.refresh();
  }

  async function placeOrder() {
    setError(null);
    if (!addressId) {
      setError("Please add a delivery address.");
      return;
    }
    setLoading(true);
    try {
      const res = await startCheckout(addressId, shipping);
      if (res.mode === "mock") {
        await confirmMockPayment(res.orderId);
        router.push(`/order-confirmation/${res.orderId}`);
        return;
      }
      await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      const RZP = (window as unknown as { Razorpay: new (o: unknown) => { open(): void } }).Razorpay;
      const rzp = new RZP({
        key: res.keyId,
        order_id: res.razorpayOrderId,
        amount: res.amount,
        currency: "INR",
        name: "VSK Sports",
        description: `Order ${res.number}`,
        prefill: { name: user.name, email: user.email },
        theme: { color: "#1B43C8" },
        handler: async (response: RazorpayResponse) => {
          try {
            await confirmRazorpayPayment(
              res.orderId,
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
            );
            router.push(`/order-confirmation/${res.orderId}`);
          } catch {
            setError("Payment verification failed. Please contact support.");
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="co-steps">
        <div className="co-step done"><span className="co-step__no">✓</span><span className="co-step__lab">Cart</span></div>
        <span className="co-step__bar done" />
        <div className="co-step done"><span className="co-step__no">✓</span><span className="co-step__lab">Address</span></div>
        <span className="co-step__bar done" />
        <div className="co-step cur"><span className="co-step__no">3</span><span className="co-step__lab">Shipping &amp; Pay</span></div>
        <span className="co-step__bar" />
        <div className="co-step"><span className="co-step__no">4</span><span className="co-step__lab">Review</span></div>
      </div>

      <div className="co-grid">
        {/* LEFT */}
        <div>
          {/* ADDRESS */}
          <div className="co-block">
            <div className="co-block__head">
              <span className="n">1</span>
              <h3>Delivery Address</h3>
              <span className="edit" onClick={() => setShowAdd((s) => !s)} role="button">
                {showAdd ? "Cancel" : "+ Add new"}
              </span>
            </div>
            <div className="co-block__body">
              {addresses.length > 0 && (
                <div className="addr-pick">
                  {addresses.map((a) => (
                    <div
                      key={a.id}
                      className={`addr-opt${addressId === a.id ? " sel" : ""}`}
                      onClick={() => setAddressId(a.id)}
                      role="button"
                    >
                      {a.isDefault && <span className="tag">Default</span>}
                      <b>{a.name}</b>
                      <p>
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.pincode}, {a.state}
                        <br />
                        {a.phone}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {showAdd && (
                <form
                  action={saveAddress}
                  style={{ marginTop: addresses.length ? 16 : 0, display: "grid", gap: 12 }}
                >
                  <div className="form-grid">
                    <div className="field"><label>Full name</label><input name="name" required /></div>
                    <div className="field"><label>Phone</label><input name="phone" required placeholder="+91" /></div>
                    <div className="field field--full"><label>Address line 1</label><input name="line1" required /></div>
                    <div className="field field--full"><label>Address line 2</label><input name="line2" /></div>
                    <div className="field"><label>City</label><input name="city" required /></div>
                    <div className="field"><label>State</label><input name="state" required /></div>
                    <div className="field"><label>PIN code</label><input name="pincode" required /></div>
                  </div>
                  <button className="btn btn--primary btn--sm" type="submit" style={{ justifySelf: "start" }}>
                    Save Address
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* SHIPPING */}
          <div className="co-block">
            <div className="co-block__head"><span className="n">2</span><h3>Shipping Method</h3></div>
            <div className="co-block__body">
              {SHIPPING.map((s) => {
                const cost = s.id === "express" ? 450 : 0;
                return (
                  <div
                    key={s.id}
                    className={`ship-opt${shipping === s.id ? " sel" : ""}`}
                    onClick={() => setShipping(s.id)}
                    role="button"
                  >
                    <span className="radio" />
                    <div className="ship-opt__b">
                      <b>{s.title}</b>
                      <span>{s.sub}</span>
                    </div>
                    <span className="ship-opt__price" style={cost === 0 ? { color: "#1FA855" } : undefined}>
                      {cost === 0 ? "FREE" : formatINR(cost)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAYMENT */}
          <div className="co-block">
            <div className="co-block__head"><span className="n">3</span><h3>Payment Method</h3></div>
            <div className="co-block__body">
              {PAYMENTS.map((p) => (
                <div
                  key={p.id}
                  className={`pay-opt${payment === p.id ? " sel" : ""}`}
                  onClick={() => setPayment(p.id)}
                  role="button"
                >
                  <span className="radio" />
                  <div className="pay-opt__b">
                    <b>{p.title}</b>
                    <span>{p.sub}</span>
                  </div>
                  <div className="pay-opt__logos">
                    {p.logos.map((l) => (
                      <span key={l}>{l}</span>
                    ))}
                  </div>
                </div>
              ))}
              {!razorpayEnabled && (
                <p className="mono-tag" style={{ marginTop: 12 }}>
                  Test mode — payment is simulated (add Razorpay keys for the live modal).
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <aside className="summary">
          <h3>Order Summary</h3>
          <div>
            {items.map((m, i) => (
              <div className="co-mini" key={i}>
                <MediaImage className="h-[48px] w-[48px] rounded-[4px] border border-line" alt={m.name} placeholder={m.name} />
                <div className="co-mini__b">
                  <b>{m.name}</b>
                  <span>{m.meta}</span>
                </div>
                <span className="co-mini__p">{formatINR(m.priceInr)}</span>
              </div>
            ))}
          </div>
          <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "16px 0" }} />
          <div className="sumline"><span>Subtotal</span><b>{formatINR(totals.subtotalInr)}</b></div>
          <div className="sumline">
            <span>Shipping</span>
            <b style={totals.shippingInr === 0 ? { color: "#1FA855" } : undefined}>
              {totals.shippingInr === 0 ? "FREE" : formatINR(totals.shippingInr)}
            </b>
          </div>
          <div className="sumline"><span>{GST_LABEL}</span><b>{formatINR(totals.gstInr)}</b></div>
          <div className="sumtotal"><span>Total</span><b>{formatINR(totals.totalInr)}</b></div>
          <p className="mono-tag" style={{ margin: "8px 0 18px" }}>Inclusive of all taxes</p>

          {error && <p style={{ color: "var(--red)", fontSize: 14, marginBottom: 12 }}>{error}</p>}

          <button
            className="btn btn--primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={placeOrder}
            disabled={loading || !addressId}
          >
            {loading ? "Processing…" : `Place Order · ${formatINR(totals.totalInr)}`}
          </button>

          <div className="pdp__trust" style={{ marginTop: 18, background: "var(--paper-2)" }}>
            <div className="tl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>256-bit secure checkout</div>
            <div className="tl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.2-8.5" /><path d="M21 3v6h-6" /></svg>Easy 7-day returns</div>
          </div>
        </aside>
      </div>
    </>
  );
}
