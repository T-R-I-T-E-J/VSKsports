"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MediaImage } from "@/components/motifs/MediaImage";
import { formatINR, stars } from "@/lib/format";
import { addToCart } from "@/app/actions/cart";

export type PdpProduct = {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  brandCountry: string | null;
  caliber: string | null;
  tags: string[];
  badge: string | null;
  priceInr: number;
  mrpInr: number | null;
  rating: number | null;
  reviewCount: number;
  description: string | null;
  stock: number;
  variants: { id: string; label: string }[];
  reviews: { id: string; authorName: string; rating: number; title: string | null; body: string }[];
};

export function ProductDetail({ p }: { p: PdpProduct }) {
  const [thumb, setThumb] = useState(0);
  const [variant, setVariant] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "specs" | "rev">("desc");
  const [added, setAdded] = useState(false);
  const router = useRouter();

  const handleAdd = () => {
    void addToCart(p.id, qty, p.variants[variant]?.label ?? null).then(() => {
      setAdded(true);
      router.refresh();
      setTimeout(() => setAdded(false), 1400);
    });
  };

  const off = p.mrpInr && p.mrpInr > p.priceInr ? p.mrpInr - p.priceInr : 0;
  const inStock = p.stock > 0;
  const desc =
    p.description ??
    `The ${p.name} — genuine ${p.brandName ?? "VSK"} stock, imported and GST-billed, with VSK setup support and a 2-year warranty. Trusted on the firing line by athletes and academies across India.`;

  const specs: [string, string][] = (
    [
      ["Brand", p.brandName ?? "VSK"],
      p.caliber ? ["Calibre", p.caliber] : null,
      p.tags.length ? ["Features", p.tags.join(" · ")] : null,
      ["Availability", inStock ? `In stock (${p.stock} units)` : "Out of stock"],
      ["Warranty", "2 years · VSK service support"],
      ["Billing", "GST tax invoice included"],
      ["Delivery", "Insured nationwide · 5–7 days"],
    ].filter(Boolean) as [string, string][]
  );

  return (
    <>
      <section className="section--tight" style={{ padding: "26px 0 70px" }}>
        <div className="wrap">
          <div className="pdp">
            {/* GALLERY */}
            <div className="pdp__gallery">
              <div className="pdp__main">
                <span className="crn tl" />
                <span className="crn br" />
                {p.badge && (
                  <div style={{ position: "absolute", top: 14, left: 14, zIndex: 3, display: "flex", gap: 6 }}>
                    <span className={`chip chip--${p.badge.toLowerCase()}`}>
                      {p.badge}
                      {off ? ` · ${formatINR(off)} off` : ""}
                    </span>
                  </div>
                )}
                <MediaImage
                  className="h-[480px] w-full max-[900px]:h-[380px]"
                  alt={`${p.name} — view ${thumb + 1}`}
                  placeholder={`${p.name} — view ${thumb + 1}`}
                />
              </div>
              <div className="pdp__thumbs">
                {[0, 1, 2, 3].map((i) => (
                  <button
                    key={i}
                    onClick={() => setThumb(i)}
                    aria-label={`View ${i + 1}`}
                    style={{ padding: 0, border: "none", background: "none", cursor: "pointer" }}
                  >
                    <MediaImage
                      className={`h-[92px] w-full rounded-[8px] border-2 ${i === thumb ? "border-blue" : "border-line"}`}
                      alt={`View ${i + 1}`}
                      placeholder={`View ${i + 1}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* INFO */}
            <div className="pdp__info">
              <span className="pdp__brand">
                {p.brandName}
                {p.brandCountry ? ` · ${p.brandCountry}` : ""}
              </span>
              <h1>{p.name}</h1>
              <div className="pdp__rate">
                <span className="stars">{stars(p.rating)}</span>{" "}
                {p.rating != null ? p.rating.toFixed(1) : "—"} ·{" "}
                <a href="#reviews" style={{ color: "var(--blue)" }}>
                  {p.reviewCount} reviews
                </a>
                {inStock && (
                  <>
                    {" "}
                    · <span style={{ color: "#1FA855" }}>In Stock</span>
                  </>
                )}
              </div>

              {p.priceInr > 0 ? (
                <div className="pdp__price">
                  <b>{formatINR(p.priceInr)}</b>
                  {p.mrpInr ? <span className="was">{formatINR(p.mrpInr)}</span> : null}
                  {off ? <span className="off">SAVE {formatINR(off)}</span> : null}
                </div>
              ) : (
                <div className="pdp__price">
                  <b style={{ fontSize: 30 }}>Request a quote</b>
                </div>
              )}

              <p className="pdp__desc">{desc}</p>

              <div className="pdp__opts">
                {p.caliber && (
                  <div className="optline">
                    <span className="lab">Calibre</span>
                    <div className="optpills">
                      <span className="optpill active">{p.caliber}</span>
                    </div>
                  </div>
                )}
                {p.variants.length > 0 && (
                  <div className="optline">
                    <span className="lab">Variant</span>
                    <div className="optpills">
                      {p.variants.map((v, i) => (
                        <span
                          key={v.id}
                          className={`optpill${i === variant ? " active" : ""}`}
                          onClick={() => setVariant(i)}
                        >
                          {v.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="optline">
                  <span className="lab">Quantity</span>
                  <div className="qty">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                    <span>{qty}</span>
                    <button onClick={() => setQty((q) => q + 1)}>+</button>
                  </div>
                </div>
              </div>

              <div className="pdp__buy">
                <button
                  className="btn btn--primary"
                  onClick={handleAdd}
                  style={added ? { background: "#1FA855" } : undefined}
                >
                  {added ? (
                    "✓ Added to Cart"
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add to Cart
                    </>
                  )}
                </button>
                <Link href="/cart" className="btn btn--red">
                  Buy Now
                </Link>
                <button className="btn btn--ghost" aria-label="Add to wishlist" style={{ flex: "0 0 auto", padding: 15 }}>
                  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M20.8 5.6a5.5 5.5 0 00-7.8 0L12 6.6l-1-1a5.5 5.5 0 00-7.8 7.8L12 22l7.8-8.6a5.5 5.5 0 001-7.8z" />
                  </svg>
                </button>
              </div>

              <div className="pdp__trust">
                <div className="tl">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  100% genuine, imported &amp; GST-billed
                </div>
                <div className="tl">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="1" y="3" width="15" height="13" />
                    <path d="M16 8h4l3 3v5h-7V8z" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  Insured nationwide delivery · 5–7 days
                </div>
                <div className="tl">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 12a9 9 0 11-6.2-8.5" />
                    <path d="M21 3v6h-6" />
                  </svg>
                  2-year warranty + VSK service support
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TABS */}
      <section className="section--alt section" id="reviews">
        <div className="wrap">
          <div className="tabs">
            <button className={`tab${tab === "desc" ? " active" : ""}`} onClick={() => setTab("desc")}>
              Description
            </button>
            <button className={`tab${tab === "specs" ? " active" : ""}`} onClick={() => setTab("specs")}>
              Specifications
            </button>
            <button className={`tab${tab === "rev" ? " active" : ""}`} onClick={() => setTab("rev")}>
              Reviews · {p.reviewCount}
            </button>
          </div>

          <div className={`tabpanel${tab === "desc" ? " active" : ""}`}>
            <div className="split2">
              <div>
                <h2 className="h-sec" style={{ fontSize: 32 }}>
                  Engineered for the&nbsp;ten-ring
                </h2>
                <p className="lead" style={{ margin: "16px 0" }}>
                  {desc}
                </p>
                {p.tags.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
                    {p.tags.map((t) => (
                      <li key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="var(--blue)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }}>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="imgframe">
                <MediaImage className="h-[420px] w-full" alt={`${p.name} on the range`} placeholder="Lifestyle / on the range" />
              </div>
            </div>
          </div>

          <div className={`tabpanel${tab === "specs" ? " active" : ""}`}>
            <div style={{ maxWidth: 680 }}>
              <table className="specs">
                <tbody>
                  {specs.map(([k, v]) => (
                    <tr key={k}>
                      <th>{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`tabpanel${tab === "rev" ? " active" : ""}`}>
            <div className="split2" style={{ alignItems: "start" }}>
              <div className="card card--pad" style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 64, lineHeight: 1 }}>
                  {p.rating != null ? p.rating.toFixed(1) : "—"}
                </div>
                <div className="stars" style={{ color: "var(--amber)", fontSize: 20, letterSpacing: 2, margin: "6px 0" }}>
                  {stars(p.rating)}
                </div>
                <div className="mono-tag">Based on {p.reviewCount} verified reviews</div>
              </div>
              <div style={{ display: "grid", gap: 18 }}>
                {p.reviews.length > 0 ? (
                  p.reviews.map((r) => (
                    <div className="card card--pad" key={r.id}>
                      <div className="stars" style={{ color: "var(--amber)" }}>
                        {stars(r.rating)}
                      </div>
                      <p style={{ margin: "10px 0", fontSize: 16 }}>
                        {r.title ? <b>{r.title}. </b> : null}
                        {r.body}
                      </p>
                      <div className="mono-tag">{r.authorName} · Verified</div>
                    </div>
                  ))
                ) : (
                  <div className="card card--pad">
                    <p style={{ fontSize: 16, color: "var(--steel)" }}>
                      No reviews yet — be the first to review the {p.name}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
