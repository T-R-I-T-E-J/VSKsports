import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { MediaImage } from "@/components/motifs/MediaImage";
import { SubmitForm } from "@/components/storefront/SubmitForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const e = await prisma.event.findUnique({ where: { slug }, select: { title: true } });
  return { title: e?.title ?? "Event" };
}

const SCHEDULE: [string, string, string, string][] = [
  ["09", "AM", "Registration & Equipment Check", "All participants"],
  ["10", "AM", "Qualification — Air Rifle", "Men & Women · all categories"],
  ["01", "PM", "Qualification — Air Pistol", "Men & Women · all categories"],
  ["04", "PM", "Finals & Prize Ceremony", "Top 8 per category"],
];
const CATEGORIES = ["Men · Senior", "Women · Senior", "Men · Junior", "Women · Junior", "Sub-Junior", "Veteran"];

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const related = await prisma.event.findMany({
    where: { slug: { not: slug } },
    take: 2,
    orderBy: { createdAt: "asc" },
  });
  const live = event.status === "LIVE";

  return (
    <>
      <section className="page-head page-head--dark">
        <svg className="page-head__rings" viewBox="0 0 420 420" fill="none">
          <circle cx="210" cy="210" r="70" stroke="#fff" strokeWidth="1" />
          <circle cx="210" cy="210" r="130" stroke="#fff" strokeWidth="1" strokeOpacity=".5" />
          <circle cx="210" cy="210" r="195" stroke="#fff" strokeWidth="1" strokeOpacity=".28" />
        </svg>
        <div className="wrap">
          <nav className="breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/events">Events</Link>
            <span className="sep">/</span>
            <span className="cur">{event.title}</span>
          </nav>
          <div style={{ display: "flex", gap: 10, margin: "14px 0", flexWrap: "wrap" }}>
            {live && (
              <span className="chip chip--live">
                <span className="dot" />
                Registration Open
              </span>
            )}
            {event.category && (
              <span className="chip" style={{ background: "rgba(255,255,255,.1)", color: "#9DB2FF", borderColor: "transparent" }}>
                {event.category}
              </span>
            )}
          </div>
          <h1 className="ph-title">{event.title}</h1>
          <div style={{ display: "flex", gap: 24, marginTop: 18, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 13, color: "#C5D2F5", letterSpacing: ".04em" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#9DB2FF" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              {event.date}, 2026
            </span>
            {event.location && (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#9DB2FF" strokeWidth={2}><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                {event.location}
              </span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#9DB2FF" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              248 / 320 registered
            </span>
          </div>
        </div>
      </section>

      <section className="section--tight" style={{ padding: "40px 0 80px" }}>
        <div className="wrap">
          <div className="split2" style={{ gridTemplateColumns: "1fr 380px", alignItems: "start", gap: 34 }}>
            {/* LEFT */}
            <div>
              <div className="imgframe" style={{ marginBottom: 28 }}>
                <MediaImage className="h-[360px] w-full" alt={event.title} placeholder={event.imageNote ?? "Event banner / range"} />
              </div>

              <h2 className="h-sec" style={{ fontSize: 30 }}>About the event</h2>
              <p className="lead" style={{ margin: "14px 0 20px" }}>
                India&apos;s premier club-level air championship returns. Compete across air rifle and
                pistol in all categories — from juniors to seniors — at VSK&apos;s flagship range.
                Electronic scoring, live leaderboards and a ₹2.5 lakh prize pool.
              </p>

              <div className="statrow" style={{ gridTemplateColumns: "repeat(3,1fr)", margin: "24px 0" }}>
                <div className="stat"><b>₹2.5L</b><span>Prize Pool</span></div>
                <div className="stat"><b>6</b><span>Categories</span></div>
                <div className="stat"><b>320</b><span>Shooter Cap</span></div>
              </div>

              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, textTransform: "uppercase", margin: "30px 0 16px" }}>Schedule</h3>
              <div className="card" style={{ overflow: "hidden" }}>
                {SCHEDULE.map(([d, ap, title, meta]) => (
                  <div className="row-item" key={title}>
                    <div className="row-date"><b>{d}</b><span>{ap}</span></div>
                    <div className="row-main">
                      <b>{title}</b>
                      <div className="row-meta"><span>{meta}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, textTransform: "uppercase", margin: "30px 0 16px" }}>Categories</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {CATEGORIES.map((c) => (
                  <span className="chip" key={c}>{c}</span>
                ))}
              </div>
            </div>

            {/* RIGHT: registration */}
            <aside className="summary" style={{ top: 96 }}>
              <h3>Register to Compete</h3>
              <div className="sumline"><span>Entry fee (per category)</span><b>₹800</b></div>
              <div className="sumline"><span>Spots remaining</span><b style={{ color: "var(--red)" }}>72 left</b></div>
              <div style={{ height: 8, background: "var(--paper-3)", borderRadius: 999, overflow: "hidden", margin: "14px 0" }}>
                <div style={{ height: "100%", width: "78%", background: "var(--blue)", borderRadius: 999 }} />
              </div>
              <SubmitForm style={{ display: "grid", gap: 14, marginTop: 6 }} message="Registered! Check your email for details.">
                <div className="field"><label>Full name</label><input required placeholder="Your name" /></div>
                <div className="field"><label>Phone</label><input required placeholder="+91" /></div>
                <div className="field"><label>Category</label><select>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
                <div className="field"><label>Event</label><select><option>Air Rifle</option><option>Air Pistol</option><option>Both</option></select></div>
                <button className="btn btn--red" style={{ width: "100%", justifyContent: "center" }}>Register · ₹800</button>
              </SubmitForm>
              <div className="pdp__trust" style={{ marginTop: 16, background: "var(--paper-2)" }}>
                <div className="tl">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
                  Secure registration · GST invoice
                </div>
              </div>
            </aside>
          </div>

          {related.length > 0 && (
            <>
              <div className="sec-head" style={{ margin: "60px 0 30px" }}>
                <div className="sec-head__t">
                  <span className="eyebrow">More Events</span>
                  <h2 className="h-sec" style={{ fontSize: 32 }}>You may also enter</h2>
                </div>
                <Link href="/events" className="sec-head__link">
                  All events
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              </div>
              <div>
                {related.map((e) => (
                  <div className="evcard" key={e.id}>
                    <MediaImage className="h-[150px] w-full max-[760px]:h-[170px]" alt={e.title} placeholder={e.imageNote ?? e.title} />
                    <div className="evcard__body">
                      {e.category && <span className="chip" style={{ marginBottom: 8 }}>{e.category}</span>}
                      <div className="evcard__title">{e.title}</div>
                      <div className="evcard__meta">
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                          {e.date}, 2026
                        </span>
                        {e.location && (
                          <span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            {e.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="evcard__cta">
                      <Link href={`/events/${e.slug}`} className="btn btn--primary btn--sm" style={{ justifyContent: "center" }}>Details</Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
