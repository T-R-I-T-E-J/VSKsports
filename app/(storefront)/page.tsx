import Link from "next/link";
import { prisma } from "@/lib/db";
import { MediaImage } from "@/components/motifs/MediaImage";
import { Chip } from "@/components/ui/Chip";
import { ProductCard } from "@/components/commerce/ProductCard";
import { RevealOnScroll } from "@/components/home/RevealOnScroll";

export const metadata = {
  title: "VSK Sports — India's Trusted Shooting Sports Partner",
};

const Arrow = ({ w = 18 }: { w?: number }) => (
  <svg viewBox="0 0 24 24" width={w} height={w} fill="none" stroke="currentColor" strokeWidth={2.4}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const Pin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CATEGORY_ORDER: { slug: string; name: string; tall: boolean; chip?: string }[] = [
  { slug: "air-rifles", name: "Air Rifles", tall: true, chip: "Most Popular" },
  { slug: "air-pistols", name: "Air Pistols", tall: false },
  { slug: "targets", name: "Targets", tall: false },
  { slug: "pellets", name: "Pellets", tall: false },
  { slug: "accessories", name: "Accessories", tall: false },
];

const catCount = (slug: string, n: number): string => {
  switch (slug) {
    case "air-rifles":
      return `${n} Products · From ₹6,500`;
    case "air-pistols":
      return `${n} Products`;
    case "targets":
      return "Paper · Metal · Electronic";
    case "pellets":
      return "All calibres · .177 / .22";
    case "accessories":
      return "Gloves · Jackets · Cases";
    default:
      return `${n} Products`;
  }
};

const splitDate = (d: string): [string, string] => {
  const [day = "", mon = ""] = d.split(" ");
  return [day, mon];
};

export default async function HomePage() {
  const [categories, featured, brands, training, events, posts] = await Promise.all([
    prisma.category.findMany({ include: { _count: { select: { products: true } } } }),
    prisma.product.findMany({
      where: { isActive: true },
      take: 4,
      orderBy: { reviewCount: "desc" },
      include: {
        brand: { select: { name: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, take: 7 }),
    prisma.trainingBatch.findMany({ take: 3, orderBy: { createdAt: "asc" } }),
    prisma.event.findMany({ take: 3, orderBy: { createdAt: "asc" } }),
    prisma.blogPost.findMany({ where: { published: true }, take: 3, orderBy: { createdAt: "asc" } }),
  ]);

  const countBySlug = new Map(categories.map((c) => [c.slug, c._count.products]));

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="hero dotgrid" id="top">
        <svg className="hero__rings" viewBox="0 0 420 420" fill="none">
          <circle cx="210" cy="210" r="60" stroke="#1B43C8" strokeWidth="1" />
          <circle cx="210" cy="210" r="110" stroke="#1B43C8" strokeWidth="1" strokeOpacity=".6" />
          <circle cx="210" cy="210" r="160" stroke="#1B43C8" strokeWidth="1" strokeOpacity=".35" />
          <circle cx="210" cy="210" r="208" stroke="#1B43C8" strokeWidth="1" strokeOpacity=".2" />
          <path d="M210 0v420M0 210h420" stroke="#1B43C8" strokeWidth="1" strokeOpacity=".25" />
        </svg>
        <div className="wrap">
          <div className="hero__grid">
            <div className="hero__copy">
              <span className="eyebrow hero__kicker">Retailer · Importer · Manufacturer</span>
              <h1>
                India&apos;s Trusted
                <br />
                <span className="ln2">
                  Shooting Sports <em>Partner</em>
                </span>
              </h1>
              <p className="hero__sub">
                Precision air rifles, pistols, targets and pro-grade gear — backed by expert
                training, events and a dealer network spanning the country.
              </p>
              <div className="hero__pills">
                <span className="hero__pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                  </svg>
                  Equipment
                </span>
                <span className="hero__pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z" />
                  </svg>
                  Training
                </span>
                <span className="hero__pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 9V2h12v7a6 6 0 01-12 0z" />
                    <path d="M6 5H3v2a3 3 0 003 3M18 5h3v2a3 3 0 01-3 3M9 21h6M12 15v6" />
                  </svg>
                  Events
                </span>
                <span className="hero__pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />
                  </svg>
                  Dealer Network
                </span>
              </div>
              <div className="hero__cta">
                <Link href="/shop" className="btn btn--primary">
                  Shop Now
                  <Arrow w={18} />
                </Link>
                <Link href="/dealers" className="btn btn--ghost">
                  Become a Dealer
                </Link>
              </div>
              <div className="hero__beginner">
                <span className="mono-tag">New to shooting?</span>
                <Link href="/shop">
                  Start with our beginner guide
                  <Arrow w={16} />
                </Link>
              </div>
            </div>
            <div className="hero__visual">
              <div className="hero__float">
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </span>
                <span>
                  <b>4.9</b>
                  <span>Rated by athletes</span>
                </span>
              </div>
              <div className="hero__frame ticks">
                <MediaImage
                  className="h-[512px] w-full max-[920px]:h-[360px]"
                  alt="Athlete on the firing line"
                  placeholder="Drop hero image — athlete on the firing line"
                />
                <div className="hero__reticle">
                  <span className="crn tl" />
                  <span className="crn tr" />
                  <span className="crn bl" />
                  <span className="crn br" />
                </div>
                <div className="hero__spec">
                  <span>
                    <b>DISCIPLINE</b>10m Air Rifle
                  </span>
                  <span>
                    <b>STOCK</b>In&nbsp;Stock
                  </span>
                  <span>
                    <b>SHIP</b>Pan-India
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="trust">
        <div className="wrap">
          <div className="trust__item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <div>
              <b>100%</b>
              <span>Genuine &amp; GST Billed</span>
            </div>
          </div>
          <div className="trust__item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="1" y="3" width="15" height="13" />
              <path d="M16 8h4l3 3v5h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <div>
              <b>28+</b>
              <span>States Delivered To</span>
            </div>
          </div>
          <div className="trust__item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <div>
              <b>120+</b>
              <span>Dealers &amp; Academies</span>
            </div>
          </div>
          <div className="trust__item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z" />
            </svg>
            <div>
              <b>8</b>
              <span>Global Brands Stocked</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SHOP BY CATEGORY ============ */}
      <section className="section" id="shop">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-head__t">
              <span className="eyebrow">Shop By Category</span>
              <h2 className="h-sec">
                Gear for every
                <br />
                line of fire
              </h2>
            </div>
            <Link href="/shop" className="sec-head__link">
              View all products
              <Arrow />
            </Link>
          </div>
          <div className="cats reveal">
            {CATEGORY_ORDER.map((c) => (
              <Link
                key={c.slug}
                className={`cat${c.tall ? " cat--tall" : ""}`}
                href={`/shop?cat=${c.slug}`}
              >
                {c.chip && <span className="cat__tag chip chip--new">{c.chip}</span>}
                <div className="cat__img">
                  <MediaImage className="h-full w-full" alt={c.name} placeholder={c.name} />
                </div>
                <div className="cat__body">
                  <span className="cat__count">{catCount(c.slug, countBySlug.get(c.slug) ?? 0)}</span>
                  <span className="cat__name">
                    {c.name}
                    <span className="arr">
                      <Arrow w={16} />
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BEGINNER PATHWAY ============ */}
      <section className="section begin" id="start">
        <svg
          className="hero__rings"
          viewBox="0 0 420 420"
          fill="none"
          style={{ left: "-140px", top: "auto", bottom: "-160px", opacity: 0.22 }}
        >
          <circle cx="210" cy="210" r="80" stroke="#fff" strokeWidth="1" />
          <circle cx="210" cy="210" r="140" stroke="#fff" strokeWidth="1" />
          <circle cx="210" cy="210" r="200" stroke="#fff" strokeWidth="1" />
        </svg>
        <div className="wrap" style={{ position: "relative", zIndex: 2 }}>
          <div className="begin__grid">
            <div className="reveal">
              <span className="eyebrow eyebrow--light">New to the sport</span>
              <h2 className="h-sec" style={{ marginTop: 16 }}>
                Start shooting
                <br />
                with confidence
              </h2>
              <p className="lead" style={{ marginTop: 18 }}>
                No experience needed. We&apos;ll match you with the right beginner rifle, the safety
                gear you need, and a coach near you — so you hit the range ready.
              </p>
              <div className="begin__kit">
                <MediaImage
                  className="h-[104px] w-[104px] shrink-0 rounded-[8px]"
                  alt="Beginner starter kit"
                  placeholder="Starter kit"
                />
                <div className="kp">
                  <span className="chip chip--sale" style={{ marginBottom: 8 }}>
                    Save 18%
                  </span>
                  <b className="kn">Beginner Starter Kit</b>
                  <p style={{ color: "var(--steel)", fontSize: 14, margin: "4px 0 8px" }}>
                    Rifle + pellets + targets + safety glasses
                  </p>
                  <span className="price">₹12,900</span>
                  <span className="was">₹15,800</span>
                </div>
              </div>
            </div>
            <div className="begin__steps reveal">
              {[
                ["01", "Pick your discipline", "10m air rifle or pistol — we explain the difference and what suits you."],
                ["02", "Get equipped", "Starter kits bundle everything a first-timer needs at a fair price."],
                ["03", "Learn from a coach", "Join a beginner camp or book personal training near you."],
                ["04", "Compete & grow", "Enter local events and track your scores as you improve."],
              ].map(([no, t, p]) => (
                <div className="step" key={no}>
                  <span className="step__no">{no}</span>
                  <div className="step__b">
                    <b>{t}</b>
                    <p>{p}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURED PRODUCTS ============ */}
      <section className="section" id="featured">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-head__t">
              <span className="eyebrow eyebrow--red">Best Sellers &amp; New Arrivals</span>
              <h2 className="h-sec">Featured products</h2>
            </div>
            <Link href="/shop" className="sec-head__link">
              Browse all
              <Arrow />
            </Link>
          </div>
          <div className="prods reveal">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURED BRANDS ============ */}
      <section className="section brands" id="brands">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-head__t">
              <span className="eyebrow">Authorised Brands</span>
              <h2 className="h-sec">
                The world&apos;s finest,
                <br />
                imported to India
              </h2>
            </div>
            <Link href="/brands" className="sec-head__link">
              All brands
              <Arrow />
            </Link>
          </div>
          <div className="brand-row reveal">
            {brands.map((b) => (
              <Link key={b.id} className="bcell" href={`/brands/${b.slug}`}>
                <span className="bcell__name">{b.name}</span>
                <span className="bcell__c">{b.country ?? "—"}</span>
              </Link>
            ))}
            <Link className="bcell bcell--vsk" href="/brands/vsk">
              <span className="bcell__name">
                VS<span className="x">K</span>
              </span>
              <span className="bcell__c">Made in India</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ WHY VSK ============ */}
      <section className="section" id="why">
        <div className="wrap">
          <div className="sec-head reveal" style={{ marginBottom: 36 }}>
            <div className="sec-head__t">
              <span className="eyebrow">Why Choose VSK Sports</span>
              <h2 className="h-sec">
                Built for athletes,
                <br />
                trusted by academies
              </h2>
            </div>
          </div>
          <div className="why reveal">
            {[
              {
                t: "Nationwide Delivery",
                p: "Insured shipping to all 28 states with careful, compliant handling.",
                svg: (
                  <>
                    <rect x="1" y="3" width="15" height="13" />
                    <path d="M16 8h4l3 3v5h-7V8z" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </>
                ),
              },
              {
                t: "GST Registered",
                p: "Proper tax invoices for individuals, academies and institutions.",
                svg: (
                  <>
                    <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
                    <path d="M9 12l2 2 4-4" />
                  </>
                ),
              },
              {
                t: "Dealer Network",
                p: "120+ partners and growing — wholesale pricing and support.",
                svg: (
                  <>
                    <path d="M3 21h18M5 21V8l7-5 7 5v13" />
                    <path d="M9 21v-6h6v6" />
                  </>
                ),
              },
              {
                t: "Expert Support",
                p: "Talk to people who shoot — honest advice on gear and fit.",
                svg: (
                  <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8z" />
                ),
              },
              {
                t: "Training Programs",
                p: "Coaching, camps and certifications run by experienced shooters.",
                svg: (
                  <>
                    <path d="M22 10L12 5 2 10l10 5 10-5z" />
                    <path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
                  </>
                ),
              },
            ].map((c) => (
              <div className="why__c" key={c.t}>
                <div className="why__ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    {c.svg}
                  </svg>
                </div>
                <b>{c.t}</b>
                <p>{c.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ VSK SPOTLIGHT ============ */}
      <section className="section spot" id="vsk">
        <svg
          className="hero__rings"
          viewBox="0 0 420 420"
          fill="none"
          style={{ right: "-140px", left: "auto", top: "-160px", opacity: 0.16 }}
        >
          <circle cx="210" cy="210" r="80" stroke="#fff" strokeWidth="1" />
          <circle cx="210" cy="210" r="150" stroke="#fff" strokeWidth="1" />
          <circle cx="210" cy="210" r="210" stroke="#fff" strokeWidth="1" />
        </svg>
        <div className="wrap" style={{ position: "relative", zIndex: 2 }}>
          <div className="spot__grid">
            <div className="reveal">
              <span className="eyebrow eyebrow--red">VSK Products · Made in India</span>
              <h2 style={{ marginTop: 16 }}>
                Our own line.
                <br />
                Pro performance,
                <br />
                fair pricing.
              </h2>
              <p className="lead" style={{ marginTop: 18 }}>
                Designed and manufactured in-house — electronic targets, training systems and range
                equipment engineered for Indian academies and built to compete.
              </p>
              <div className="spot__feats">
                {[
                  ["0.1mm Scoring", "Match-grade accuracy"],
                  ["2-Year Warranty", "Local service support"],
                  ["Academy Pricing", "Bulk & institution rates"],
                  ["Spare Parts", "Always in stock"],
                ].map(([t, s]) => (
                  <div className="spot__feat" key={t}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <div>
                      <b>{t}</b>
                      <span>{s}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/electronic-target" className="btn btn--red" style={{ marginTop: 30 }}>
                Explore VSK Products
                <Arrow />
              </Link>
            </div>
            <div className="spot__visual reveal ticks">
              <span className="spot__badge chip chip--vsk">Exclusive to VSK</span>
              <MediaImage
                className="h-[430px] w-full"
                alt="VSK manufactured electronic target"
                placeholder="VSK manufactured product — electronic target"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRAINING + EVENTS ============ */}
      <section className="section" id="training">
        <div className="wrap">
          <div className="te">
            {/* TRAINING */}
            <div className="panel reveal">
              <div className="panel__head">
                <h3>Training Programs</h3>
                <Link href="/training" className="sec-head__link" style={{ fontSize: 14 }}>
                  All batches
                  <Arrow w={15} />
                </Link>
              </div>
              {training.map((b) => {
                const [day, mon] = splitDate(b.date);
                return (
                  <div className="row-item" key={b.id}>
                    <div className="row-date">
                      <b>{day}</b>
                      <span>{mon}</span>
                    </div>
                    <div className="row-main">
                      <b>{b.title}</b>
                      <div className="row-meta">
                        {b.location && (
                          <span>
                            <Pin />
                            {b.location}
                          </span>
                        )}
                        {b.duration && <span>{b.duration}</span>}
                      </div>
                    </div>
                    <div className="row-cta">
                      <Link href="/training" className="btn btn--ghost btn--sm">
                        Register
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* EVENTS */}
            <div className="panel reveal" id="events">
              <div className="panel__head">
                <h3>Upcoming Events</h3>
                <Link href="/events" className="sec-head__link" style={{ fontSize: 14 }}>
                  Full calendar
                  <Arrow w={15} />
                </Link>
              </div>
              {events.map((e) => {
                const [day, mon] = splitDate(e.date);
                const live = e.status === "LIVE";
                return (
                  <div className="row-item" key={e.id}>
                    <div className="row-date">
                      <b>{day}</b>
                      <span>{mon}</span>
                    </div>
                    <div className="row-main">
                      <b>{e.title}</b>
                      <div className="row-meta">
                        {live ? (
                          <Chip variant="live">Registration Open</Chip>
                        ) : (
                          e.category && <span>{e.category}</span>
                        )}
                        {e.location && <span>{e.location}</span>}
                      </div>
                    </div>
                    <div className="row-cta">
                      <Link
                        href="/events"
                        className={`btn btn--sm ${live ? "btn--red" : "btn--ghost"}`}
                      >
                        {live ? "Enter" : "Details"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============ DEALER BAND ============ */}
      <section className="section section--tight" id="dealer">
        <div className="wrap">
          <div className="dealer reveal">
            <svg
              className="dealer__map"
              viewBox="0 0 600 360"
              fill="none"
              preserveAspectRatio="xMidYMid slice"
            >
              <g stroke="#fff" strokeWidth="1" opacity=".6">
                <path d="M0 60h600M0 120h600M0 180h600M0 240h600M0 300h600M60 0v360M150 0v360M240 0v360M330 0v360M420 0v360M510 0v360" />
              </g>
              <g fill="#fff">
                <circle cx="150" cy="120" r="4" />
                <circle cx="240" cy="180" r="4" />
                <circle cx="330" cy="90" r="4" />
                <circle cx="420" cy="240" r="4" />
                <circle cx="510" cy="150" r="4" />
                <circle cx="90" cy="240" r="4" />
                <circle cx="300" cy="300" r="4" />
              </g>
            </svg>
            <div className="dealer__in">
              <div>
                <span className="eyebrow eyebrow--light">Dealer Network · Huge Opportunity</span>
                <h2 style={{ marginTop: 16 }}>Become a VSK Sports dealer</h2>
                <p className="lead" style={{ marginTop: 14 }}>
                  Strong margins, marketing support and a fast-growing product range. Join 120+
                  partners building shooting sports across India.
                </p>
                <div className="dealer__stats">
                  <div>
                    <b>120+</b>
                    <span>Active Dealers</span>
                  </div>
                  <div>
                    <b>30%+</b>
                    <span>Dealer Margins</span>
                  </div>
                  <div>
                    <b>48h</b>
                    <span>Onboarding</span>
                  </div>
                </div>
              </div>
              <div className="dealer__cta">
                <Link href="/dealers" className="btn btn--light">
                  Apply to Become a Dealer
                </Link>
                <Link href="/dealers" className="btn btn--ondark">
                  Find a Dealer Near You
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="section" id="reviews">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-head__t">
              <span className="eyebrow">What Shooters Say</span>
              <h2 className="h-sec">Trusted on the line</h2>
            </div>
          </div>
          <div className="tests reveal">
            {[
              {
                q: "Bought my first air rifle here as a complete beginner. The team helped me pick the right model and the starter kit saved me money. Delivery to Nagpur was quick.",
                n: "Aarav Deshmukh",
                r: "Beginner · Nagpur",
                a: "A",
              },
              {
                q: "As an academy we order in bulk. GST billing, genuine stock and the VSK electronic targets have held up brilliantly through daily practice.",
                n: "Priya Nair Academy",
                r: "Shooting Club · Kochi",
                a: "P",
              },
              {
                q: "Becoming a dealer was the best decision. Margins are healthy and support is genuinely responsive. The brand range keeps customers coming back.",
                n: "Rohit Sharma",
                r: "VSK Dealer · Jaipur",
                a: "R",
              },
            ].map((t) => (
              <div className="test" key={t.n}>
                <span className="test__stars">★★★★★</span>
                <p className="test__q">&ldquo;{t.q}&rdquo;</p>
                <div className="test__who">
                  <MediaImage className="h-11 w-11 rounded-full" alt={t.n} placeholder={t.a} />
                  <div>
                    <b>{t.n}</b>
                    <span>{t.r}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BLOG ============ */}
      <section className="section brands" id="blog">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-head__t">
              <span className="eyebrow eyebrow--red">From The Range · Blog</span>
              <h2 className="h-sec">Guides, reviews &amp; tips</h2>
            </div>
            <Link href="/blog" className="sec-head__link">
              All articles
              <Arrow />
            </Link>
          </div>
          <div className="blog reveal">
            {posts.map((post) => (
              <Link className="post" key={post.id} href={`/blog/${post.slug}`}>
                <MediaImage className="h-[200px] w-full" alt={post.title} placeholder="Blog image" />
                <div className="post__body">
                  {post.category && <span className="post__cat">{post.category}</span>}
                  <h3 className="post__t">{post.title}</h3>
                  {post.excerpt && <p className="post__ex">{post.excerpt}</p>}
                  <span className="post__meta">
                    {[post.readTime ? `${post.readTime} read` : null, post.publishedAt]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CONTACT ============ */}
      <section className="section contact" id="contact">
        <div className="wrap">
          <div className="contact__grid">
            <div className="reveal">
              <span className="eyebrow">Get In Touch</span>
              <h2 className="h-sec" style={{ marginTop: 16 }}>
                Talk to a real
                <br />
                shooter today
              </h2>
              <p className="lead" style={{ marginTop: 16 }}>
                Questions about gear, bulk orders, training or becoming a dealer? Reach us however
                suits you — we reply fast.
              </p>
              <div className="contact__cards">
                <a className="cc cc--call" href="tel:+919876543210">
                  <span className="cc__ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
                    </svg>
                  </span>
                  <div>
                    <b>Call Us</b>
                    <span>+91 98765 43210 · Mon–Sat, 10–7</span>
                  </div>
                </a>
                <a className="cc cc--wa" href="#">
                  <span className="cc__ic">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1a8 8 0 01-2.4-1.5 9 9 0 01-1.6-2c-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5a.5.5 0 000-.5L9 6.7c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3A2.8 2.8 0 006.3 8.7c0 1.2.8 2.3 1 2.5.1.2 1.8 2.7 4.3 3.8 2.6 1.1 2.6.7 3 .7.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.4M12 2a10 10 0 00-8.6 15l-1.1 4 4.2-1.1A10 10 0 1012 2z" />
                    </svg>
                  </span>
                  <div>
                    <b>WhatsApp</b>
                    <span>One-click chat — instant replies</span>
                  </div>
                </a>
                <a className="cc cc--mail" href="mailto:hello@vsksports.in">
                  <span className="cc__ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M2 7l10 6 10-6" />
                    </svg>
                  </span>
                  <div>
                    <b>Email</b>
                    <span>hello@vsksports.in</span>
                  </div>
                </a>
              </div>
            </div>
            <div className="contact__map reveal">
              <svg className="pin" width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" />
              </svg>
              <MediaImage
                className="h-[420px] w-full"
                alt="VSK Sports HQ location map"
                placeholder="Google Maps — VSK Sports HQ"
              />
            </div>
          </div>
        </div>
      </section>

      <RevealOnScroll />
    </>
  );
}
