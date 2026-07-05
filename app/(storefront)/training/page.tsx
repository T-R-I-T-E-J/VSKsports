import Link from "next/link";
import { Fragment } from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/storefront/PageHeader";
import { MediaImage } from "@/components/motifs/MediaImage";
import { SubmitForm } from "@/components/storefront/SubmitForm";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Training" };

const PROGRAMS = [
  { t: "Personal Coaching", p: "One-on-one sessions tailored to your discipline and goals.", svg: <Fragment><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Fragment> },
  { t: "Camps", p: "Summer and advanced camps — immersive, multi-day training.", svg: <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /> },
  { t: "Workshops", p: "Technical & maintenance workshops to master your equipment.", svg: <path d="M14.7 6.3a4 4 0 010 5.6l-7 7L2 21l2.1-5.7 7-7a4 4 0 015.6 0z" /> },
  { t: "Certifications", p: "Official programs with certificates recognised by academies.", svg: <Fragment><circle cx="12" cy="8" r="6" /><path d="M9 13l-1 8 4-2 4 2-1-8" /></Fragment> },
];

const levelLabel = (l: string) => l.charAt(0) + l.slice(1).toLowerCase();

export default async function TrainingPage() {
  const batches = await prisma.trainingBatch.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader
        dark
        title="Train with the best"
        crumbs={[{ label: "Home", href: "/" }, { label: "Training" }]}
        sub="Coaching, camps, workshops and certifications run by experienced shooters — for absolute beginners through to national-level athletes."
        actions={
          <>
            <a href="#batches" className="btn btn--red">See Upcoming Batches</a>
            <a href="#register" className="btn btn--ondark">Register Now</a>
          </>
        }
      />

      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow">What We Offer</span>
              <h2 className="h-sec" style={{ fontSize: 40 }}>Programs for every stage</h2>
            </div>
          </div>
          <div className="benefits stack-sm" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {PROGRAMS.map((p) => (
              <div className="benefit" key={p.t}>
                <div className="benefit__ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>{p.svg}</svg>
                </div>
                <b>{p.t}</b>
                <p>{p.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt" id="batches">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow eyebrow--red">Enrolment Open</span>
              <h2 className="h-sec" style={{ fontSize: 40 }}>Upcoming batches</h2>
            </div>
            <span className="mono-tag">Updated weekly</span>
          </div>
          <div>
            {batches.map((b) => (
              <div className="evcard" key={b.id}>
                <MediaImage className="h-[150px] w-full max-[760px]:h-[170px]" alt={b.title} placeholder={b.imageNote ?? b.title} />
                <div className="evcard__body">
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span className="chip chip--new">{levelLabel(b.level)}</span>
                    {b.spotsNote && <span className="mono-tag" style={{ color: "var(--red)" }}>{b.spotsNote}</span>}
                  </div>
                  <div className="evcard__title">{b.title}</div>
                  <div className="evcard__meta">
                    <span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                      {b.date}
                    </span>
                    {b.location && (
                      <span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        {b.location}
                      </span>
                    )}
                    {b.duration && (
                      <span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                        {b.duration}
                      </span>
                    )}
                  </div>
                </div>
                <div className="evcard__cta">
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, textAlign: "right" }}>
                    {b.priceInr ? formatINR(b.priceInr) : "—"}
                  </span>
                  <a href="#register" className="btn btn--primary btn--sm" style={{ justifyContent: "center" }}>Register</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="split2">
            <div className="imgframe">
              <MediaImage className="h-[420px] w-full" alt="Coach with athlete" placeholder="Coach with athlete" />
            </div>
            <div>
              <span className="eyebrow">Why Train With VSK</span>
              <h2 className="h-sec" style={{ fontSize: 36, marginTop: 14 }}>Coaches who&apos;ve been on the line</h2>
              <p className="lead" style={{ margin: "16px 0 22px" }}>
                Our coaches are former competitive shooters who know what it takes. Beginner-friendly,
                safety-first, and obsessive about the fundamentals that build great scores.
              </p>
              <div style={{ display: "grid", gap: 14 }}>
                {[
                  ["Small batch sizes", "real attention per shooter"],
                  ["Equipment provided", "try before you buy"],
                  ["Pathway to competition", "we enter you in events"],
                ].map(([b, rest]) => (
                  <div key={b} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--blue)" strokeWidth={2} style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5" /></svg>
                    <span>
                      <b style={{ fontFamily: "var(--font-display)", textTransform: "uppercase" }}>{b}</b> — {rest}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt" id="register">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <span className="eyebrow" style={{ justifyContent: "center" }}>Registration</span>
            <h2 className="h-sec" style={{ fontSize: 38, marginTop: 14 }}>Reserve your spot</h2>
            <p className="lead" style={{ margin: "14px auto 0" }}>Tell us a bit about yourself and we&apos;ll match you to the right batch.</p>
          </div>
          <SubmitForm className="card card--pad" style={{ display: "grid", gap: 18 }} message="Thanks! We'll call you within 24 hours to confirm.">
            <div className="form-grid">
              <div className="field"><label>Full name <span className="req">*</span></label><input placeholder="Your name" required /></div>
              <div className="field"><label>Phone <span className="req">*</span></label><input placeholder="+91" required /></div>
              <div className="field"><label>Email</label><input type="email" placeholder="you@email.com" /></div>
              <div className="field"><label>City</label><input placeholder="City" /></div>
              <div className="field"><label>Discipline</label><select><option>Air Rifle</option><option>Air Pistol</option><option>Not sure yet</option></select></div>
              <div className="field"><label>Experience</label><select><option>Complete beginner</option><option>Some experience</option><option>Intermediate</option><option>Advanced</option></select></div>
              <div className="field field--full"><label>Program of interest</label><select><option>Beginner Air Rifle Camp</option><option>Advanced Pistol Workshop</option><option>Personal Coaching</option><option>Maintenance Certification</option></select></div>
            </div>
            <button className="btn btn--primary" style={{ justifyContent: "center" }}>Submit Registration</button>
          </SubmitForm>
        </div>
      </section>
    </>
  );
}
