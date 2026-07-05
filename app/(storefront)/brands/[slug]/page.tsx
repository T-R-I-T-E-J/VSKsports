import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/commerce/ProductCard";
import { MediaImage } from "@/components/motifs/MediaImage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = await prisma.brand.findUnique({ where: { slug }, select: { name: true } });
  return { title: b?.name ?? "Brand" };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await prisma.brand.findUnique({
    where: { slug },
    include: {
      _count: { select: { products: true } },
      products: {
        where: { isActive: true },
        include: { brand: { select: { name: true } }, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } },
        orderBy: { reviewCount: "desc" },
      },
    },
  });
  if (!brand) notFound();

  const isVsk = brand.slug === "vsk" || brand.name.toUpperCase() === "VSK";
  const darkStat = { background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.12)" };

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
            <Link href="/brands">Brands</Link>
            <span className="sep">/</span>
            <span className="cur">{brand.name}</span>
          </nav>
          <div className="brandhero" style={{ marginTop: 24 }}>
            <div>
              <div className="brandhero__logo" style={{ color: "#fff" }}>
                {isVsk ? (
                  <>
                    VS<span style={{ color: "var(--red)" }}>K</span>
                  </>
                ) : (
                  brand.name
                )}
              </div>
              <p className="ph-sub" style={{ marginTop: 18 }}>
                {brand.description ??
                  `${brand.name} — genuine products, imported and GST-billed. VSK is an authorised ${brand.name} partner for India.`}
              </p>
              <div className="statrow" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 26, maxWidth: 520 }}>
                <div className="stat" style={darkStat}>
                  <b style={{ color: "#9DB2FF" }}>{brand.country ?? "—"}</b>
                  <span style={{ color: "#9AA6BE" }}>Origin</span>
                </div>
                <div className="stat" style={darkStat}>
                  <b style={{ color: "#9DB2FF" }}>{brand._count.products}</b>
                  <span style={{ color: "#9AA6BE" }}>Products at VSK</span>
                </div>
                <div className="stat" style={darkStat}>
                  <b style={{ color: "#9DB2FF" }}>Genuine</b>
                  <span style={{ color: "#9AA6BE" }}>GST Billed</span>
                </div>
              </div>
            </div>
            <div className="imgframe">
              <MediaImage className="h-[420px] w-full" alt={`${brand.name} flagship`} placeholder={`${brand.name} flagship`} />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow">{brand.name} · In Stock</span>
              <h2 className="h-sec" style={{ fontSize: 38 }}>
                Shop {brand.name}
              </h2>
            </div>
          </div>
          {brand.products.length > 0 ? (
            <div className="pgrid">
              {brand.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <p className="lead">No products listed for {brand.name} yet.</p>
          )}
        </div>
      </section>
    </>
  );
}
