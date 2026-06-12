"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { computeTotals } from "@/lib/pricing";
import { formatINR } from "@/lib/format";
import { placeBulkOrder } from "../actions";

type WholesaleProduct = {
  id: string;
  name: string;
  brand: string;
  retailInr: number;
  dealerInr: number;
};

export function BulkOrderForm({
  products,
  creditLimitInr,
  creditUsedInr,
}: {
  products: WholesaleProduct[];
  creditLimitInr: number | null;
  creditUsedInr: number;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ number: string; totalInr: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const lines = useMemo(
    () =>
      products
        .map((p) => ({ product: p, quantity: qty[p.id] ?? 0 }))
        .filter((l) => l.quantity > 0),
    [products, qty],
  );
  const subtotal = lines.reduce((s, l) => s + l.product.dealerInr * l.quantity, 0);
  const totals = computeTotals(subtotal, "standard");
  const unitCount = lines.reduce((s, l) => s + l.quantity, 0);
  const available = creditLimitInr != null ? Math.max(0, creditLimitInr - creditUsedInr) : null;
  const overCredit = available != null && totals.totalInr > available;

  function setQuantity(id: string, value: string) {
    const n = Math.max(0, Math.min(9999, Math.floor(Number(value) || 0)));
    setQty((q) => ({ ...q, [id]: n }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await placeBulkOrder(lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })));
      if (res.ok) {
        setPlaced({ number: res.number, totalInr: res.totalInr });
        setQty({});
      } else {
        setError(res.error);
      }
    });
  }

  if (placed) {
    return (
      <div className="cpanel" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div className="cpanel__body" style={{ padding: "44px 32px" }}>
          <span
            style={{
              width: 64, height: 64, borderRadius: "50%", background: "#E4F7EC", color: "#1FA855",
              display: "inline-grid", placeItems: "center", fontSize: 30, marginBottom: 18,
            }}
            aria-hidden
          >
            ✓
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, textTransform: "uppercase" }}>
            Bulk order placed
          </h2>
          <p style={{ color: "var(--steel)", fontSize: 15, margin: "10px 0 4px" }}>
            Order number
          </p>
          <p data-testid="bulk-order-number" style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 22, color: "var(--blue)" }}>
            {placed.number}
          </p>
          <p style={{ color: "var(--steel)", fontSize: 14, marginTop: 8 }}>
            Total {formatINR(placed.totalInr)} (incl. GST) charged against your credit account. A
            confirmation email has been sent.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22 }}>
            <Link href="/dealer/invoices" className="btn btn--primary btn--sm">View Invoices</Link>
            <button className="btn btn--ghost btn--sm" onClick={() => setPlaced(null)}>
              New Bulk Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }} className="border-grid-fallback">
      <div className="cpanel">
        <div className="cpanel__head">
          <h3>Wholesale Catalog</h3>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--steel)" }}>
            {products.length} products at dealer pricing
          </span>
        </div>
        <div className="cpanel__body dwrap" style={{ paddingTop: 8 }}>
          <table className="dtable">
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ textAlign: "right" }}>Retail</th>
                <th style={{ textAlign: "right" }}>Dealer Price</th>
                <th style={{ textAlign: "center" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const q = qty[p.id] ?? 0;
                return (
                  <tr key={p.id}>
                    <td className="pname">
                      <span>{p.brand}</span>
                      <b>{p.name}</b>
                    </td>
                    <td className="num" style={{ fontWeight: 600, color: "var(--steel)" }}>{formatINR(p.retailInr)}</td>
                    <td className="num">{formatINR(p.dealerInr)}</td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        className="qty-in"
                        type="number"
                        min={0}
                        max={9999}
                        value={q === 0 ? "" : q}
                        placeholder="0"
                        onChange={(e) => setQuantity(p.id, e.target.value)}
                        aria-label={`Quantity for ${p.name}`}
                      />
                    </td>
                    <td className="num">{q > 0 ? formatINR(p.dealerInr * q) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cpanel dsummary">
        <div className="cpanel__head">
          <h3>Order Summary</h3>
        </div>
        <div className="cpanel__body">
          <div className="row">
            <span className="k">Items</span>
            <span className="v">{unitCount} units · {lines.length} lines</span>
          </div>
          <div className="row">
            <span className="k">Subtotal (dealer)</span>
            <span className="v">{formatINR(totals.subtotalInr)}</span>
          </div>
          <div className="row">
            <span className="k">GST (18%)</span>
            <span className="v">{formatINR(totals.gstInr)}</span>
          </div>
          <div className="row">
            <span className="k">Shipping</span>
            <span className="v" style={totals.shippingInr === 0 ? { color: "#1FA855" } : undefined}>
              {totals.shippingInr === 0 ? "FREE" : formatINR(totals.shippingInr)}
            </span>
          </div>
          <div className="row total">
            <span className="k">Total</span>
            <span className="v">{formatINR(totals.totalInr)}</span>
          </div>

          {creditLimitInr != null && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: overCredit ? "var(--red)" : "var(--steel)", margin: "10px 0 0", lineHeight: 1.6 }}>
              Credit available: {formatINR(available ?? 0)} of {formatINR(creditLimitInr)}
              {overCredit ? " — this order exceeds your available credit." : ""}
            </p>
          )}

          {error && (
            <p role="alert" style={{ background: "var(--red-wash)", color: "var(--red)", fontSize: 13, padding: "10px 12px", borderRadius: 8, marginTop: 12 }}>
              {error}
            </p>
          )}

          <button
            className="btn btn--primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
            disabled={pending || lines.length === 0}
            onClick={submit}
          >
            {pending ? "Placing order…" : "Place Bulk Order"}
          </button>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--mute)", marginTop: 10, lineHeight: 1.6 }}>
            Billed on account · payment due against invoice. GST invoice issued on dispatch.
          </p>
        </div>
      </div>

      <style>{`@media(max-width:980px){ .border-grid-fallback{ grid-template-columns:1fr !important; } .dsummary{ position:static !important; } }`}</style>
    </div>
  );
}
