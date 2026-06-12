import Link from "next/link";
import { PageHeader } from "@/components/storefront/PageHeader";
import { MediaImage } from "@/components/motifs/MediaImage";

export const metadata = { title: "About Us" };

const STATS: [string, string][] = [
  ["6", "Ways We Serve"],
  ["120+", "Dealer Partners"],
  ["8", "Global Brands"],
  ["28", "States Reached"],
];

const WHAT_WE_DO: [string, string][] = [
  ["Retailer", "Selling genuine equipment directly to shooters across India."],
  ["Importer", "Bringing the world's finest brands into the Indian market."],
  ["Manufacturer", "Building our own VSK line — targets, rifles and range systems."],
  ["Distributor", "Supplying dealers, academies and institutions at scale."],
  ["Training Provider", "Coaching, camps, workshops and certifications."],
  ["Event Organizer", "Competitions and shooting events that grow the sport."],
];

const LEADERS: [string, string, string][] = [
  ["V. S. Kumar", "Founder & CEO", "A lifelong shooting enthusiast who turned a passion for the sport into a national mission."],
  ["Anjali Rao", "Head of Training", "Former national-level shooter leading VSK's coaching and certification programs."],
  ["Rohit Verma", "Head of Dealer Network", "Building VSK's dealer ecosystem across every state in India."],
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        dark
        title="Equipping India's shooting sports"
        crumbs={[{ label: "Home", href: "/" }, { label: "About Us" }]}
        sub="VSK Sports is a retailer, importer, manufacturer and training provider on a mission to make precision shooting accessible, credible and competitive across India."
      />

      <section className="section">
        <div className="wrap">
          <div className="split2">
            <div>
              <span className="eyebrow">Our Story</span>
              <h2 className="h-sec" style={{ fontSize: 36, marginTop: 14 }}>Built by shooters, for shooters</h2>
              <p className="lead" style={{ margin: "16px 0" }}>
                VSK Sports began with a simple frustration: serious shooting equipment in India was
                hard to find, harder to trust, and rarely came with real guidance. We set out to fix
                that.
              </p>
              <p style={{ color: "var(--steel)" }}>
                Today we supply athletes, academies, institutions and dealers nationwide — importing
                the world&apos;s best brands, manufacturing our own VSK line, and running the training
                and events that grow the sport.
              </p>
            </div>
            <div className="imgframe ticks">
              <MediaImage className="h-[420px] w-full" alt="VSK team and facility" placeholder="Team / facility photo" />
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap">
          <div className="split2">
            <div className="card card--pad">
              <div className="benefit__ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, textTransform: "uppercase", margin: "6px 0 10px" }}>Our Vision</h3>
              <p style={{ color: "var(--steel)", fontSize: 16 }}>
                To be India&apos;s most trusted name in shooting sports — recognised nationally for
                genuine equipment, expert support and a thriving community of athletes.
              </p>
            </div>
            <div className="card card--pad">
              <div className="benefit__ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z" /></svg>
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, textTransform: "uppercase", margin: "6px 0 10px" }}>Our Mission</h3>
              <p style={{ color: "var(--steel)", fontSize: 16 }}>
                Make precision shooting accessible — pairing the right equipment with real coaching,
                fair pricing and nationwide reach, from first-timers to national champions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section--tight" style={{ padding: "46px 0" }}>
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
          <div className="split2" style={{ alignItems: "start" }}>
            <div>
              <span className="eyebrow">What We Do</span>
              <h2 className="h-sec" style={{ fontSize: 36, margin: "14px 0 24px" }}>Six businesses, one mission</h2>
              <div className="timeline">
                {WHAT_WE_DO.map(([b, p], i) => (
                  <div className="tl-item" key={b} style={i === WHAT_WE_DO.length - 1 ? { paddingBottom: 0 } : undefined}>
                    <b>{b}</b>
                    <p>{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="imgframe" style={{ position: "sticky", top: 96 }}>
              <MediaImage className="h-[560px] w-full" alt="VSK showroom and range" placeholder="Showroom / range" />
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt" id="leadership">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow">Leadership</span>
              <h2 className="h-sec" style={{ fontSize: 40 }}>The people behind VSK</h2>
            </div>
          </div>
          <div className="leaders">
            {LEADERS.map(([name, role, bio]) => (
              <div className="leader" key={name}>
                <MediaImage className="h-[280px] w-full" alt={name} placeholder={role} />
                <div className="leader__body">
                  <b>{name}</b>
                  <div className="role">{role}</div>
                  <p>{bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="dealer" style={{ background: "linear-gradient(110deg,var(--blue-ink),var(--blue))" }}>
            <div className="dealer__in" style={{ gridTemplateColumns: "1.4fr .6fr" }}>
              <div>
                <h2 style={{ color: "#fff", fontSize: "clamp(28px,3.4vw,42px)" }}>Let&apos;s build the future of shooting in India</h2>
                <p className="lead" style={{ color: "#C5D2F5", marginTop: 12 }}>
                  Whether you&apos;re a beginner, an academy or a dealer — there&apos;s a place for you at VSK.
                </p>
              </div>
              <div className="dealer__cta">
                <Link href="/shop" className="btn btn--light">Shop Equipment</Link>
                <Link href="/contact" className="btn btn--ondark">Get in Touch</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
