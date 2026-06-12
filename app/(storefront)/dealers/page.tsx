import { Fragment } from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/storefront/PageHeader";
import { MediaImage } from "@/components/motifs/MediaImage";
import { SubmitForm } from "@/components/storefront/SubmitForm";

export const metadata = { title: "Dealer Network" };

const STATS: [string, string][] = [
  ["120+", "Active Dealers"],
  ["30%+", "Dealer Margins"],
  ["28", "States Covered"],
  ["48h", "Onboarding Time"],
];

const BENEFITS = [
  { t: "Healthy Margins", p: "Competitive wholesale pricing with 30%+ margins on most lines, and better on VSK products.", svg: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /> },
  { t: "Marketing Support", p: "Co-branded creatives, catalogues, and lead-sharing from our national campaigns.", svg: <path d="M3 11l19-9-9 19-2-8-8-2z" /> },
  { t: "Fast Replenishment", p: "Reliable stock and quick dispatch so you never miss a sale.", svg: <Fragment><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></Fragment> },
  { t: "Dedicated Support", p: "A real account manager who knows the sport and your market.", svg: <path d="M22 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6A8.4 8.4 0 0112.5 3h.5a8.48 8.48 0 018 8z" /> },
  { t: "Dealer Dashboard", p: "Place orders, track shipments and download invoices online.", svg: <Fragment><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></Fragment> },
  { t: "Training Access", p: "Bring VSK coaching and camps to your region — a recurring revenue stream.", svg: <Fragment><circle cx="12" cy="8" r="6" /><path d="M9 13l-1 8 4-2 4 2-1-8" /></Fragment> },
];

const STEPS: [string, string, string][] = [
  ["01", "Apply", "Fill the form with your business details and GST."],
  ["02", "Verify", "We review and call you to discuss terms and territory."],
  ["03", "Stock Up", "Place your opening order at dealer pricing."],
  ["04", "Sell & Grow", "Get marketing support and start earning."],
];

export default async function DealersPage() {
  const dealers = await prisma.dealer.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader
        dark
        title="Partner with VSK Sports"
        crumbs={[{ label: "Home", href: "/" }, { label: "Dealer Network" }]}
        sub="Build a profitable shooting-sports business with strong margins, marketing support and a fast-growing product range. Join 120+ dealers across India."
        actions={
          <>
            <a href="#apply" className="btn btn--red">Apply to Become a Dealer</a>
            <a href="#locator" className="btn btn--ondark">Find a Dealer</a>
          </>
        }
      />

      <section className="section--tight" style={{ padding: "40px 0" }}>
        <div className="wrap">
          <div className="statrow">
            {STATS.map(([b, s]) => (
              <div className="stat" key={s}>
                <b>{b}</b>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow">Dealer Benefits</span>
              <h2 className="h-sec" style={{ fontSize: 40 }}>Why dealers choose VSK</h2>
            </div>
          </div>
          <div className="benefits">
            {BENEFITS.map((b) => (
              <div className="benefit" key={b.t}>
                <div className="benefit__ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>{b.svg}</svg>
                </div>
                <b>{b.t}</b>
                <p>{b.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow eyebrow--red">How It Works</span>
              <h2 className="h-sec" style={{ fontSize: 40 }}>Onboard in 48 hours</h2>
            </div>
          </div>
          <div className="benefits" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {STEPS.map(([no, t, p]) => (
              <div className="benefit" key={no}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 40, color: "var(--blue)", marginBottom: 10 }}>{no}</div>
                <b>{t}</b>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="locator">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow">Dealer Locator</span>
              <h2 className="h-sec" style={{ fontSize: 40 }}>Find a dealer near you</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>
            <div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Search by city or PIN</label>
                <input placeholder="e.g. Mumbai or 400001" />
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {dealers.map((d) => (
                  <div className="cc" style={{ background: "#fff" }} key={d.id}>
                    <span className="cc__ic" style={{ background: "var(--blue-wash)", color: "var(--blue)" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></svg>
                    </span>
                    <div style={{ flex: 1 }}>
                      <b style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", fontSize: 16, display: "block" }}>{d.name}</b>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--steel)" }}>{d.city}</span>
                    </div>
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--blue)" strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </div>
                ))}
              </div>
            </div>
            <div className="imgframe" style={{ position: "relative" }}>
              <MediaImage className="h-[420px] w-full" alt="Map view of dealers" placeholder="Map view of dealers" />
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt" id="apply">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <span className="eyebrow" style={{ justifyContent: "center" }}>Become a Dealer</span>
            <h2 className="h-sec" style={{ fontSize: 38, marginTop: 14 }}>Apply now</h2>
            <p className="lead" style={{ margin: "14px auto 0" }}>Takes 3 minutes. We&apos;ll get back to you within 48 hours.</p>
          </div>
          <SubmitForm className="card card--pad" style={{ display: "grid", gap: 18 }} message="Application received! Our partnerships team will call you within 48 hours.">
            <div className="form-grid">
              <div className="field"><label>Business name <span className="req">*</span></label><input required /></div>
              <div className="field"><label>Contact person <span className="req">*</span></label><input required /></div>
              <div className="field"><label>Phone <span className="req">*</span></label><input placeholder="+91" required /></div>
              <div className="field"><label>Email</label><input type="email" /></div>
              <div className="field"><label>City <span className="req">*</span></label><input required /></div>
              <div className="field"><label>GST Number</label><input placeholder="GSTIN" /></div>
              <div className="field"><label>Business type</label><select><option>Retail Store</option><option>Shooting Academy</option><option>Sports Distributor</option><option>Online Seller</option></select></div>
              <div className="field"><label>Years in business</label><select><option>New / Starting up</option><option>1–3 years</option><option>3–10 years</option><option>10+ years</option></select></div>
              <div className="field field--full"><label>Tell us about your business</label><textarea placeholder="Your market, current products, expected volumes…" /></div>
            </div>
            <button className="btn btn--primary" style={{ justifyContent: "center" }}>Submit Application</button>
          </SubmitForm>
        </div>
      </section>
    </>
  );
}
