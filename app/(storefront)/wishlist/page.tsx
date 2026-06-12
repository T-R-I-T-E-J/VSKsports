import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/storefront/PageHeader";
import { ProductCard } from "@/components/commerce/ProductCard";
import { MoveAllToCart } from "@/components/commerce/MoveAllToCart";

export const metadata = { title: "My Wishlist" };

export default async function WishlistPage() {
  const session = await auth();
  const items = session?.user?.id
    ? await prisma.wishlistItem.findMany({
        where: { userId: session.user.id },
        include: { product: { include: { brand: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const products = items.map((i) => i.product);

  return (
    <>
      <PageHeader
        title="My Wishlist"
        crumbs={[{ label: "Home", href: "/" }, { label: "Wishlist" }]}
        sub="Your saved gear, ready when you are. Move items to cart or keep building your kit."
      />

      <section className="section--tight" style={{ padding: "34px 0 80px" }}>
        <div className="wrap">
          {products.length > 0 ? (
            <>
              <div className="toolbar">
                <div className="toolbar__count">
                  <b>{products.length}</b> saved item{products.length !== 1 ? "s" : ""}
                </div>
                <div className="toolbar__right">
                  <MoveAllToCart />
                </div>
              </div>
              <div className="prods">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} wishlisted />
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--paper-3)", color: "var(--mute)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
                <svg viewBox="0 0 24 24" width={38} height={38} fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path d="M20.8 5.6a5.5 5.5 0 00-7.8 0L12 6.6l-1-1a5.5 5.5 0 00-7.8 7.8L12 22l7.8-8.6a5.5 5.5 0 001-7.8z" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, textTransform: "uppercase" }}>
                Your wishlist is empty
              </h3>
              <p style={{ color: "var(--steel)", margin: "10px 0 22px" }}>
                Save products you love and find them here.
              </p>
              <Link href="/shop" className="btn btn--primary">Browse Shop</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
