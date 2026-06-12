import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/storefront/PageHeader";
import { MediaImage } from "@/components/motifs/MediaImage";

export const metadata = { title: "Brands" };

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Authorised Brands"
        crumbs={[{ label: "Home", href: "/" }, { label: "Brands" }]}
        sub="We import and distribute the world's finest shooting brands — plus our own VSK line, made in India. Every product is genuine, warrantied and GST-billed."
      />

      <section className="section">
        <div className="wrap">
          <div className="brandgrid">
            {brands.map((b) => {
              const isVsk = b.slug === "vsk" || b.name.toUpperCase() === "VSK";
              return (
                <Link key={b.id} className="brandcard" href={`/brands/${b.slug}`}>
                  <div className="brandcard__top">
                    <span className="brandcard__flag">{b.country ?? "—"}</span>
                    <span className="brandcard__logo" style={{ color: b.color ?? "var(--ink)" }}>
                      {isVsk ? (
                        <>
                          VS<span style={{ color: "var(--red)" }}>K</span>
                        </>
                      ) : (
                        b.name
                      )}
                    </span>
                  </div>
                  <div className="brandcard__body">
                    <p>{b.description ?? `Authorised ${b.name} products — genuine and GST-billed at VSK Sports.`}</p>
                    <div className="brandcard__foot">
                      <span>{b._count.products} products</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--blue)" }}>
                        View brand
                        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4}>
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section spot" style={{ background: "var(--ink)", color: "#fff" }}>
        <div className="wrap">
          <div className="spot__grid">
            <div>
              <span className="eyebrow eyebrow--red">VSK · Made in India</span>
              <h2 style={{ color: "#fff", fontSize: "clamp(34px,4.4vw,54px)", marginTop: 16 }}>
                Our own brand, built to compete
              </h2>
              <p className="lead" style={{ color: "#AEB9D2", marginTop: 16 }}>
                From electronic targets to club rifles and range systems — engineered in-house for
                Indian academies at honest, accessible pricing.
              </p>
              <Link href="/electronic-target" className="btn btn--red" style={{ marginTop: 26 }}>
                Explore VSK Products
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <div className="imgframe ticks">
              <MediaImage className="h-[420px] w-full" alt="VSK product line" placeholder="VSK product line" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
