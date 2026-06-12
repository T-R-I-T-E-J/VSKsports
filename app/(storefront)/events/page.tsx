import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/storefront/PageHeader";
import { EventsTabs } from "@/components/storefront/EventsTabs";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const events = await prisma.event.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader
        title="Events & Competitions"
        crumbs={[{ label: "Home", href: "/" }, { label: "Events" }]}
        sub="Compete, qualify and climb the rankings. VSK organises and supports shooting events across India — from local opens to national invitationals."
      />

      <section className="section--tight" style={{ padding: "34px 0" }}>
        <div className="wrap">
          <div className="dealer" style={{ background: "linear-gradient(110deg,var(--blue-ink),var(--blue))" }}>
            <div className="dealer__in" style={{ gridTemplateColumns: "1.3fr .7fr" }}>
              <div>
                <span className="chip chip--live" style={{ marginBottom: 14 }}>
                  <span className="dot" />
                  Registration Live
                </span>
                <h2 style={{ color: "#fff", fontSize: "clamp(30px,3.6vw,46px)" }}>VSK Open 10m Championship 2026</h2>
                <p className="lead" style={{ color: "#C5D2F5", marginTop: 12 }}>
                  India&apos;s premier club-level air championship. Air rifle &amp; pistol, all categories. Mumbai · 28 June 2026.
                </p>
                <div className="dealer__stats">
                  <div><b>₹2.5L</b><span>Prize Pool</span></div>
                  <div><b>320</b><span>Shooters</span></div>
                  <div><b>6</b><span>Categories</span></div>
                </div>
              </div>
              <div className="dealer__cta">
                <Link href="/events/vsk-open-10m-championship" className="btn btn--light">Register to Compete</Link>
                <Link href="/events/vsk-open-10m-championship" className="btn btn--ondark">Download Schedule</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section--tight" style={{ padding: "20px 0 80px" }}>
        <div className="wrap">
          <EventsTabs events={events} />
        </div>
      </section>
    </>
  );
}
