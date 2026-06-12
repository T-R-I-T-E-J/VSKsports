import "./review.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MediaImage } from "@/components/motifs/MediaImage";
import { submitReview } from "@/app/actions/reviews";
import { fmtDate, shortName } from "../../account/_shared";
import { MiniStars, StarPicker } from "./StarPicker";

export const metadata = { title: "Write a Review" };

export default async function WriteReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; item?: string; submitted?: string; error?: string }>;
}) {
  // /reviews is not covered by middleware — enforce auth here.
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const sp = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Purchased items (reviewable = linked to a product), optionally scoped to ?order=
  const purchased = await prisma.orderItem.findMany({
    where: {
      productId: { not: null },
      order: {
        userId,
        ...(sp.order ? { OR: [{ id: sp.order }, { number: sp.order }] } : {}),
      },
    },
    include: {
      product: { include: { brand: { select: { name: true } } } },
      order: { select: { id: true, number: true, createdAt: true } },
    },
    orderBy: { id: "desc" },
    take: 24,
  });

  const selected = sp.item ? purchased.find((p) => p.id === sp.item) ?? null : null;

  return (
    <>
      <section className="page-head">
        <svg className="page-head__rings" viewBox="0 0 420 420" fill="none">
          <circle cx="210" cy="210" r="70" stroke="#1B43C8" strokeWidth="1" />
          <circle cx="210" cy="210" r="130" stroke="#1B43C8" strokeWidth="1" strokeOpacity=".5" />
          <circle cx="210" cy="210" r="195" stroke="#1B43C8" strokeWidth="1" strokeOpacity=".28" />
        </svg>
        <div className="wrap">
          <nav className="breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/account?tab=orders">Orders</Link>
            <span className="sep">/</span>
            <span className="cur">Write a Review</span>
          </nav>
          <h1 className="ph-title">Write a Review</h1>
          <p className="ph-sub">Share your experience to help other shooters choose with confidence.</p>
        </div>
      </section>

      <section className="section--tight" style={{ padding: "34px 0 80px" }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          {sp.submitted ? (
            /* done state */
            <div className="card card--pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#E4F7EC", color: "#1FA855", display: "grid", placeItems: "center", marginBottom: 16 }}>
                <svg viewBox="0 0 24 24" width={36} height={36} fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, textTransform: "uppercase" }}>
                Thanks for your review!
              </h3>
              <p style={{ color: "var(--steel)", margin: "10px 0 22px" }}>
                It has been submitted for moderation and will appear on the product page once approved, usually within 24 hours.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/shop" className="btn btn--primary">Back to Shop</Link>
                <Link href="/account" className="btn btn--ghost">My Account</Link>
              </div>
            </div>
          ) : !selected ? (
            /* product picker */
            <div className="card card--pad">
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, textTransform: "uppercase", margin: "0 0 6px" }}>
                Pick a Product to Review
              </h3>
              <p style={{ color: "var(--steel)", fontSize: 14, marginBottom: 12 }}>
                Reviews are linked to your verified purchases{sp.order ? ` from order #${sp.order}` : ""}.
              </p>
              {purchased.length === 0 && (
                <p className="mono-tag" style={{ padding: "16px 0" }}>
                  No purchased products found{sp.order ? " on that order" : ""}. <Link href="/shop" style={{ color: "var(--blue)" }}>Browse the shop</Link>.
                </p>
              )}
              {purchased.map((it) => (
                <div className="pick-row" key={it.id}>
                  <MediaImage alt={it.name} placeholder={it.product?.brand?.name ?? "Item"} className="h-14 w-14 shrink-0 rounded-lg border border-(--line)" />
                  <div style={{ flex: 1 }}>
                    <span className="prod__brand">{it.product?.brand?.name ?? "VSK"}</span>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, textTransform: "uppercase" }}>{it.name}</div>
                    <span className="mono-tag">Order #{it.order.number} · {fmtDate(it.order.createdAt)}</span>
                  </div>
                  <Link href={`/reviews/write?item=${it.id}${sp.order ? `&order=${sp.order}` : ""}`} className="btn btn--primary btn--sm">
                    Review
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* product header */}
              <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", marginBottom: 18 }}>
                <MediaImage alt={selected.name} placeholder={selected.product?.brand?.name ?? "Item"} className="h-16 w-16 shrink-0 rounded-lg border border-(--line)" />
                <div>
                  <span className="prod__brand">{selected.product?.brand?.name ?? "VSK"}</span>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, textTransform: "uppercase" }}>{selected.name}</div>
                  <span className="mono-tag">Verified purchase · Order #{selected.order.number}</span>
                </div>
              </div>

              <form action={submitReview} className="card card--pad">
                <input type="hidden" name="orderItemId" value={selected.id} />

                {sp.error === "rating" && (
                  <p style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12, marginBottom: 12, textAlign: "center" }}>
                    Please tap a star rating before submitting.
                  </p>
                )}
                {sp.error === "body" && (
                  <p style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12, marginBottom: 12, textAlign: "center" }}>
                    Please write a few words about the product.
                  </p>
                )}

                <div style={{ textAlign: "center", padding: "10px 0 20px", borderBottom: "1px solid var(--line)", marginBottom: 22 }}>
                  <label style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 12 }}>
                    Overall Rating
                  </label>
                  <StarPicker name="rating" />
                </div>

                <div style={{ marginBottom: 22 }}>
                  <div className="rate-row"><span style={{ fontWeight: 600 }}>Accuracy</span><MiniStars /></div>
                  <div className="rate-row"><span style={{ fontWeight: 600 }}>Build Quality</span><MiniStars /></div>
                  <div className="rate-row"><span style={{ fontWeight: 600 }}>Value for Money</span><MiniStars /></div>
                </div>

                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Review title</label>
                  <input name="title" placeholder="Sum it up in a line" />
                </div>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Your review</label>
                  <textarea name="body" required placeholder="What did you like? How does it perform? Who would you recommend it to?" style={{ minHeight: 140 }} />
                </div>
                <div className="field" style={{ marginBottom: 18 }}>
                  <label>Add photos (optional)</label>
                  <div className="dropz-row">
                    <MediaImage alt="Add photo" placeholder="+" className="h-[74px] w-full rounded border border-(--line)" />
                    <MediaImage alt="Add photo" placeholder="+" className="h-[74px] w-full rounded border border-(--line)" />
                    <MediaImage alt="Add photo" placeholder="+" className="h-[74px] w-full rounded border border-(--line)" />
                    <MediaImage alt="Add photo" placeholder="+" className="h-[74px] w-full rounded border border-(--line)" />
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ink-2)", marginBottom: 20 }}>
                  <input type="checkbox" defaultChecked className="rsel" style={{ width: 18, height: 18 }} />
                  Post under my name ({shortName(user?.name)})
                </label>
                <button type="submit" className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }}>
                  Submit Review
                </button>
                <p className="mono-tag" style={{ textAlign: "center", marginTop: 12 }}>
                  Reviews are checked before publishing, usually within 24 hours.
                </p>
              </form>
            </>
          )}
        </div>
      </section>
    </>
  );
}
