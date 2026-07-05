import Link from "next/link";
import { Fragment } from "react";
import "../electronic-target.css";
import { MediaImage } from "@/components/motifs/MediaImage";
import { QuoteForm } from "@/components/storefront/QuoteForm";

export const metadata = { title: "SightLine Electronic Target" };

const FEATURES = [
  {
    t: "0.1mm Scoring",
    p: "Acoustic sensor array pinpoints every shot to a tenth of a millimetre — true match-grade accuracy.",
    svg: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </>
    ),
  },
  {
    t: "Live Leaderboards",
    p: "Wi-Fi connects every lane to a big-screen leaderboard and the coach's tablet in real time.",
    svg: <path d="M5 12.5a7 7 0 0114 0M8.5 15.5a3.5 3.5 0 017 0M12 18.5h.01M2 9a11 11 0 0120 0" />,
  },
  {
    t: "Score Analytics",
    p: "Per-shot history, group analysis and trend charts help athletes see exactly where to improve.",
    svg: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 5-6" />
      </>
    ),
  },
  {
    t: "Academy Pricing",
    p: "Built in India to land at a fraction of imported systems — equip a whole range for less.",
    svg: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  },
  {
    t: "No Paper, No Pellet Traps",
    p: "Self-healing shot surface means thousands of shots between consumable changes.",
    svg: (
      <>
        <path d="M21 12a9 9 0 11-6.2-8.5" />
        <path d="M21 3v6h-6" />
      </>
    ),
  },
  {
    t: "2-Year Warranty",
    p: "Local service support and spares always in stock — no waiting on imports.",
    svg: (
      <>
        <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
];

const TRUST = [
  ["ISSF", "Spec Compatible", <path key="a" d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z" />],
  ["Wi-Fi", "Live Leaderboards", <Fragment key="b"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></Fragment>],
  ["Cloud", "Score Analytics", <Fragment key="c"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></Fragment>],
  ["India", "Service & Spares", <Fragment key="d"><path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></Fragment>],
] as const;

const SPECS: [string, string][] = [
  ["Discipline", "10m Air Rifle & Pistol (ISSF layout)"],
  ["Scoring resolution", "0.1 mm"],
  ["Sensor type", "Acoustic triangulation array"],
  ["Score latency", "Under 1 second"],
  ["Connectivity", "Wi-Fi · Ethernet · USB"],
  ["Display", "Lane monitor + coach tablet + big-screen"],
  ["Shot surface life", "~50,000 shots (self-healing)"],
  ["Power", "110–240V · <30W per lane"],
  ["Warranty", "2 years · local service"],
];

export default function ElectronicTargetPage() {
  return (
    <>
      {/* HERO */}
      <section className="et-hero">
        <div className="et-hero__grid" />
        <svg
          className="page-head__rings"
          viewBox="0 0 420 420"
          fill="none"
          style={{ opacity: 0.14, top: "-120px", right: "-100px" }}
        >
          <circle cx="210" cy="210" r="80" stroke="#fff" strokeWidth="1" />
          <circle cx="210" cy="210" r="150" stroke="#fff" strokeWidth="1" />
          <circle cx="210" cy="210" r="210" stroke="#fff" strokeWidth="1" />
        </svg>
        <div className="wrap">
          <div>
            <span className="eyebrow eyebrow--red">VSK Pro Series · Made in India</span>
            <h1 style={{ marginTop: 18 }}>
              SightLine
              <br />
              <em>Electronic</em>
              <br />
              Target
            </h1>
            <p className="et-hero__sub">
              Match-grade electronic scoring engineered for Indian academies. Sub-millimetre
              accuracy, instant scores, live leaderboards — at a fraction of imported prices.
            </p>
            <div className="et-hero__cta">
              <Link href="/contact" className="btn btn--red">
                Request a Quote
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <a href="#how" className="btn btn--ondark">
                See How It Works
              </a>
            </div>
            <div className="et-hero__stats">
              <div>
                <b>0.1mm</b>
                <span>Scoring Accuracy</span>
              </div>
              <div>
                <b>&lt;1s</b>
                <span>Score Latency</span>
              </div>
              <div>
                <b>2 yr</b>
                <span>Local Warranty</span>
              </div>
            </div>
          </div>
          <div className="et-vis">
            <div className="et-hud">
              <span className="lab">Live Score · Lane 4</span>
              <div className="big">
                10<span className="u">.9</span>
              </div>
              <div className="ring">
                <svg width="110" height="110" viewBox="0 0 110 110">
                  <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
                  <circle cx="55" cy="55" r="34" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
                  <circle cx="55" cy="55" r="22" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
                  <circle cx="55" cy="55" r="11" fill="none" stroke="#2E5BE6" strokeWidth="2" />
                  <circle cx="57" cy="52" r="4" fill="#F23645" />
                  <path d="M55 6v98M6 55h98" stroke="rgba(255,255,255,.1)" strokeWidth="1" />
                </svg>
              </div>
              <span className="lab">Inner-ten · Series 58.4</span>
            </div>
            <div className="et-vis__frame ticks">
              <MediaImage
                className="h-[460px] w-full bg-[#0E1320] text-white/40"
                alt="SightLine electronic target unit"
                placeholder="SightLine electronic target unit"
              />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="trust">
        <div className="wrap">
          {TRUST.map(([b, s, svg]) => (
            <div className="trust__item" key={b}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                {svg}
              </svg>
              <div>
                <b>{b}</b>
                <span>{s}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow">Why SightLine</span>
              <h2 className="h-sec">Precision, made accessible</h2>
            </div>
          </div>
          <div className="et-feat">
            {FEATURES.map((f) => (
              <div className="et-fcard" key={f.t}>
                <div className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    {f.svg}
                  </svg>
                </div>
                <b>{f.t}</b>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section section--alt" id="how">
        <div className="wrap">
          <div className="split2" style={{ alignItems: "center" }}>
            <div>
              <span className="eyebrow eyebrow--red">How It Works</span>
              <h2 className="h-sec" style={{ fontSize: 38, margin: "14px 0 18px" }}>
                From shot to score
                <br />
                in under a second
              </h2>
              <div className="et-steps stack-sm" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {[
                  ["01", "Fire", "Pellet passes through the sensor frame."],
                  ["02", "Detect", "Acoustic array triangulates the exact position."],
                  ["03", "Score", "Value appears instantly on screen & tablet."],
                  ["04", "Analyse", "Every shot logs to the cloud for review."],
                ].map(([no, t, p]) => (
                  <div className="et-step" key={no}>
                    <div className="no">{no}</div>
                    <b>{t}</b>
                    <p>{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="imgframe ticks">
              <MediaImage className="h-[420px] w-full" alt="Range with SightLine lanes" placeholder="Range with SightLine lanes" />
            </div>
          </div>
        </div>
      </section>

      {/* SPECS + QUOTE */}
      <section className="section">
        <div className="wrap">
          <div className="split2 stack-sm" style={{ gridTemplateColumns: "1fr 380px", alignItems: "start", gap: 40 }}>
            <div>
              <span className="eyebrow">Technical Specifications</span>
              <h2 className="h-sec" style={{ fontSize: 34, margin: "14px 0 20px" }}>
                Built to compete
              </h2>
              <table className="specs">
                <tbody>
                  {SPECS.map(([k, v]) => (
                    <tr key={k}>
                      <th>{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <aside className="summary" style={{ top: 96 }}>
              <span className="chip chip--vsk" style={{ marginBottom: 12 }}>
                VSK Pro Series
              </span>
              <h3 style={{ marginBottom: 6 }}>Request a Quote</h3>
              <p style={{ color: "var(--steel)", fontSize: 14, marginBottom: 16 }}>
                Pricing depends on lane count and installation. Tell us your setup and we&apos;ll
                prepare a tailored quote within 48 hours.
              </p>
              <QuoteForm />
              <div className="pdp__trust" style={{ marginTop: 16, background: "var(--paper-2)" }}>
                <div className="tl">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                  Or call +91 98765 43210
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="section--tight" style={{ padding: "20px 0 80px" }}>
        <div className="wrap">
          <div className="dealer" style={{ background: "linear-gradient(110deg,var(--blue-ink),var(--blue))" }}>
            <div className="dealer__in stack-sm" style={{ gridTemplateColumns: "1.4fr .6fr" }}>
              <div>
                <span className="eyebrow eyebrow--light">Equip Your Range</span>
                <h2 style={{ color: "#fff", fontSize: "clamp(28px,3.4vw,42px)", marginTop: 12 }}>
                  Bring electronic scoring to your academy
                </h2>
                <p className="lead" style={{ color: "#C5D2F5", marginTop: 12 }}>
                  Join the academies already training on SightLine. Bulk and institutional pricing
                  available.
                </p>
              </div>
              <div className="dealer__cta">
                <Link href="/contact" className="btn btn--light">
                  Request a Quote
                </Link>
                <Link href="/training" className="btn btn--ondark">
                  Book a Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
