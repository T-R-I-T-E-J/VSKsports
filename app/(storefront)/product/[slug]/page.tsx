import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/commerce/ProductCard";
import { ProductDetail } from "@/components/commerce/ProductDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({ where: { slug }, select: { name: true } });
  return { title: p?.name ?? "Product" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      inventory: true,
      variants: true,
      category: true,
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!product) notFound();

  const related = await prisma.product.findMany({
    where: {
      id: { not: product.id },
      isActive: true,
      ...(product.categoryId ? { categoryId: product.categoryId } : {}),
    },
    take: 4,
    orderBy: { reviewCount: "desc" },
    include: { brand: { select: { name: true } } },
  });

  const pdp = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brandName: product.brand?.name ?? null,
    brandCountry: product.brand?.country ?? null,
    caliber: product.caliber,
    tags: product.tags,
    badge: product.badge,
    priceInr: product.priceInr,
    mrpInr: product.mrpInr,
    rating: product.rating,
    reviewCount: product.reviewCount,
    description: product.description,
    stock: product.inventory?.stock ?? 0,
    variants: product.variants.map((v) => ({ id: v.id, label: v.label })),
    reviews: product.reviews.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      title: r.title,
      body: r.body,
    })),
  };

  return (
    <>
      <div className="wrap" style={{ paddingTop: 26 }}>
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/shop">Shop</Link>
          <span className="sep">/</span>
          {product.category && (
            <>
              <Link href={`/shop?cat=${product.category.slug}`}>{product.category.name}</Link>
              <span className="sep">/</span>
            </>
          )}
          <span className="cur">{product.name}</span>
        </nav>
      </div>

      <ProductDetail p={pdp} />

      {related.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-head__t">
                <span className="eyebrow">You may also need</span>
                <h2 className="h-sec" style={{ fontSize: 36 }}>
                  Complete the setup
                </h2>
              </div>
              <Link href="/shop" className="sec-head__link">
                Browse all
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <div className="pgrid">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
