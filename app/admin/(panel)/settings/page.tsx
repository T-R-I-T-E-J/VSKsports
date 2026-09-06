import { one, type SP } from "../_lib/admin";
import { PageHead, Panel } from "../_lib/ui";
import { getPricingConfig } from "@/lib/settings";
import { DEFAULT_PRICING, gstLabel } from "@/lib/pricing";
import { formatINR } from "@/lib/format";
import { saveSettings } from "./actions";

export const metadata = { title: "Settings — VSK Admin" };

/**
 * Pricing settings.
 *
 * This page exists because the GST rate, the delivery charges and the
 * free-delivery threshold were hardcoded in lib/pricing.ts. Correcting a tax
 * rate — a business decision that can arrive from an accountant on any given
 * Tuesday — required an engineer and a deploy. Now it does not.
 */
export default async function AdminSettings({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const error = one(sp.error);
  const saved = one(sp.saved);
  const cfg = await getPricingConfig();

  const changed = (Object.keys(DEFAULT_PRICING) as (keyof typeof DEFAULT_PRICING)[]).filter(
    (k) => cfg[k] !== DEFAULT_PRICING[k],
  );

  return (
    <div>
      <PageHead
        title={<>Settings</>}
        sub="Pricing rules applied to every new order"
      />

      {error ? (
        <Panel>
          <p role="alert" style={{ color: "#b3261e", margin: 0 }}>
            {error}
          </p>
        </Panel>
      ) : null}

      {saved ? (
        <Panel>
          <p role="status" style={{ color: "#146c2e", margin: 0 }}>
            Saved. New orders are priced with these rates from now on.
          </p>
        </Panel>
      ) : null}

      <Panel>
        <form action={saveSettings} className="adm-form">
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: 10 }}>Tax</legend>

            <label className="fld">
              <span>GST rate</span>
              <input
                name="gstRate"
                type="number"
                step="0.001"
                min="0"
                max="0.5"
                defaultValue={cfg.gstRate}
                required
              />
              <small>
                A fraction, not a percentage — enter <code>0.12</code> for 12%. Currently shown to
                customers as “{gstLabel(cfg)}”.
              </small>
            </label>

            {/*
              Sporting goods are commonly taxed above the 5% this shop launched
              with. Saying so here puts the question in front of the person who
              can actually answer it, rather than leaving it buried in code.
            */}
            <p className="hint" style={{ marginTop: 6 }}>
              <strong>Check this with your accountant.</strong> The shop launched at 5%. Sporting
              goods (HSN 9506) frequently attract a higher rate. Under-collecting is a liability
              that lands on you, retroactively.
            </p>
          </fieldset>

          <fieldset style={{ border: 0, padding: 0, margin: "18px 0 0" }}>
            <legend style={{ fontWeight: 600, marginBottom: 10 }}>Delivery</legend>

            <label className="fld">
              <span>Free delivery above (₹)</span>
              <input
                name="freeShippingThresholdInr"
                type="number"
                step="1"
                min="0"
                defaultValue={cfg.freeShippingThresholdInr}
                required
              />
              <small>
                Standard delivery is free once the goods subtotal reaches{" "}
                {formatINR(cfg.freeShippingThresholdInr)}.
              </small>
            </label>

            <label className="fld">
              <span>Standard delivery (₹)</span>
              <input
                name="standardShippingInr"
                type="number"
                step="1"
                min="0"
                defaultValue={cfg.standardShippingInr}
                required
              />
            </label>

            <label className="fld">
              <span>Express delivery (₹)</span>
              <input
                name="expressShippingInr"
                type="number"
                step="1"
                min="0"
                defaultValue={cfg.expressShippingInr}
                required
              />
              <small>Express is charged regardless of order value.</small>
            </label>
          </fieldset>

          <div style={{ marginTop: 18 }}>
            <button className="btn btn--primary" type="submit">
              Save settings
            </button>
          </div>
        </form>
      </Panel>

      <Panel>
        <h3 style={{ marginTop: 0 }}>What these affect</h3>
        <p className="hint">
          Rates apply to <strong>new orders only</strong>. Orders already placed keep the amounts
          they were charged, and their invoices continue to show the rate that was in force at the
          time — changing a value here never rewrites history.
        </p>
        <p className="hint">
          {changed.length === 0
            ? "All values are at their original defaults."
            : `Changed from the defaults: ${changed.join(", ")}.`}
        </p>
      </Panel>
    </div>
  );
}
