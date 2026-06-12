import { PageHeader } from "@/components/storefront/PageHeader";

export const metadata = { title: "Policies & Legal" };

const NAV = [
  ["privacy", "Privacy Policy"],
  ["terms", "Terms of Service"],
  ["shipping", "Shipping Policy"],
  ["returns", "Returns & Refunds"],
  ["compliance", "Compliance & Legal"],
];

const hr = <hr style={{ margin: "40px 0", border: "none", borderTop: "1px solid var(--line)" }} />;

export default function PoliciesPage() {
  return (
    <>
      <PageHeader
        title="Policies & Legal"
        crumbs={[{ label: "Home", href: "/" }, { label: "Policies & Legal" }]}
        sub="Everything about how we ship, return, protect your data and stay compliant. Last updated 1 June 2026."
      />

      <section className="section--tight" style={{ padding: "34px 0 80px" }}>
        <div className="wrap">
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 36, alignItems: "start" }} className="max-[820px]:!grid-cols-1">
            <nav style={{ position: "sticky", top: 96, display: "flex", flexDirection: "column", gap: 4 }}>
              {NAV.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="rounded-md px-3 py-2.5 text-[14px] font-medium text-steel transition-colors hover:bg-paper-2 hover:text-blue"
                >
                  {label}
                </a>
              ))}
            </nav>

            <div className="article" style={{ maxWidth: "none", margin: 0 }}>
              <div id="privacy">
                <span className="eyebrow">Privacy</span>
                <h2 style={{ marginTop: 12 }}>Privacy Policy</h2>
                <p>We collect only what we need to fulfil your orders and improve your experience — your name, contact details, delivery address and order history. We never sell your data.</p>
                <h3>What we collect</h3>
                <ul>
                  <li>Account &amp; contact information you provide</li>
                  <li>Order, payment and delivery details</li>
                  <li>Site usage data to improve our service</li>
                </ul>
                <h3>How we use it</h3>
                <p>To process orders, provide support, send order updates, and — only with your consent — occasional product news. You can opt out of marketing anytime.</p>
              </div>

              {hr}
              <div id="terms">
                <span className="eyebrow">Terms</span>
                <h2 style={{ marginTop: 12 }}>Terms of Service</h2>
                <p>By using vsksports.in you agree to these terms. You must be of legal age to purchase shooting equipment and responsible for complying with local regulations.</p>
                <h3>Orders &amp; pricing</h3>
                <p>All prices are in INR and inclusive of applicable GST unless stated. We reserve the right to refuse or cancel orders, including where local law restricts a product in your area.</p>
                <h3>Acceptable use</h3>
                <p>Products sold are for lawful sport, training and recreational use only. Misuse is solely the buyer&apos;s responsibility.</p>
              </div>

              {hr}
              <div id="shipping">
                <span className="eyebrow">Shipping</span>
                <h2 style={{ marginTop: 12 }}>Shipping Policy</h2>
                <p>We deliver insured across all 28 states. Standard delivery takes 5–7 business days; express options are offered at checkout.</p>
                <ul>
                  <li>Free standard shipping on orders above ₹2,000</li>
                  <li>All shipments are insured in transit</li>
                  <li>Restricted items may need extra documentation by state</li>
                  <li>Tracking is available in your account once dispatched</li>
                </ul>
              </div>

              {hr}
              <div id="returns">
                <span className="eyebrow">Returns</span>
                <h2 style={{ marginTop: 12 }}>Returns &amp; Refunds</h2>
                <p>We want you on the line with the right gear. Unused items in original packaging can be returned within 7 days of delivery.</p>
                <blockquote>Air rifles and pistols that have been fired or zeroed are non-returnable for safety and hygiene reasons.</blockquote>
                <h3>How refunds work</h3>
                <p>Approved refunds are processed to your original payment method within 5–7 business days. Shipping charges are non-refundable unless the return is due to our error.</p>
              </div>

              {hr}
              <div id="compliance">
                <span className="eyebrow eyebrow--red">Compliance</span>
                <h2 style={{ marginTop: 12 }}>Compliance &amp; Legal</h2>
                <p>VSK Sports is a GST-registered supplier committed to responsible retail. We sell air-sport equipment that complies with applicable Indian regulations on muzzle energy and calibre.</p>
                <h3>Your responsibility</h3>
                <p>Air-gun rules vary by state. It is the buyer&apos;s responsibility to ensure ownership and use are lawful in their jurisdiction. We may request identification or documentation for certain products.</p>
                <h3>Safety first</h3>
                <p>Always treat every air gun as if it is loaded, use appropriate eye protection, and shoot only in safe, designated areas. Keep equipment secured and away from children.</p>
                <div className="cc cc--call" style={{ marginTop: 22, maxWidth: 420 }}>
                  <span className="cc__ic" style={{ background: "var(--blue-wash)", color: "var(--blue)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
                  </span>
                  <div>
                    <b>Questions on compliance?</b>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--steel)" }}>compliance@vsksports.in</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
