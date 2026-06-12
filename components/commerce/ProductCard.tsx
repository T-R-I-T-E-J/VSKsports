import Link from "next/link";
import { MediaImage } from "@/components/motifs/MediaImage";
import { Chip } from "@/components/ui/Chip";
import { WishlistButton } from "@/components/commerce/WishlistButton";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { formatINR, stars } from "@/lib/format";

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  caliber: string | null;
  tags: string[];
  badge: string | null;
  priceInr: number;
  mrpInr: number | null;
  rating: number | null;
  reviewCount: number;
  brand: { name: string } | null;
};

const BADGE: Record<string, "new" | "sale" | "vsk"> = {
  sale: "sale",
  new: "new",
  vsk: "vsk",
};

export function ProductCard({
  product,
  wishlisted = false,
}: {
  product: CardProduct;
  wishlisted?: boolean;
}) {
  const specs = [
    product.caliber ? `${product.caliber} CAL` : null,
    ...product.tags,
  ].filter(Boolean) as string[];
  const badgeVariant = product.badge ? BADGE[product.badge.toLowerCase()] : undefined;

  return (
    <article className="prod">
      <div className="prod__media">
        {badgeVariant && (
          <div className="prod__tags">
            <Chip variant={badgeVariant}>{product.badge}</Chip>
          </div>
        )}
        <WishlistButton productId={product.id} active={wishlisted} className="prod__wish" />
        <Link href={`/product/${product.slug}`} aria-label={product.name}>
          <MediaImage
            className="h-[208px] w-full"
            alt={product.name}
            placeholder={`${product.brand?.name ?? "VSK"} — ${product.name}`}
          />
        </Link>
      </div>
      <div className="prod__body">
        <span className="prod__brand">{product.brand?.name ?? "VSK"}</span>
        <Link href={`/product/${product.slug}`}>
          <h3 className="prod__name">{product.name}</h3>
        </Link>
        {specs.length > 0 && (
          <div className="prod__specs">
            {specs.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        )}
        <div className="prod__rate">
          <span className="stars">{stars(product.rating)}</span>
          {product.rating != null ? product.rating.toFixed(1) : "—"} ·{" "}
          {product.reviewCount} reviews
        </div>
        <div className="prod__foot">
          {product.priceInr > 0 ? (
            <>
              <div className="prod__price">
                <b>{formatINR(product.priceInr)}</b>
                {product.mrpInr ? (
                  <span className="was">{formatINR(product.mrpInr)}</span>
                ) : null}
              </div>
              <AddToCartButton productId={product.id} className="prod__add" ariaLabel="Add to cart">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </AddToCartButton>
            </>
          ) : (
            <Link className="prod__inquiry" href={`/product/${product.slug}`}>
              Request a quote
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
