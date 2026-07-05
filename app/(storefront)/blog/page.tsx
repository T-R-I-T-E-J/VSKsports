import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/storefront/PageHeader";
import { MediaImage } from "@/components/motifs/MediaImage";

export const metadata = { title: "Blog" };

const CHIPS = ["All", "Beginner Guides", "Product Reviews", "Competition", "Maintenance", "Training Tips"];
const meta = (readTime: string | null, publishedAt: string | null) =>
  [readTime ? `${readTime} read` : null, publishedAt].filter(Boolean).join(" · ");

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({ where: { published: true }, orderBy: { createdAt: "asc" } });
  const [featured, ...rest] = posts;

  return (
    <>
      <PageHeader
        title="From the Range"
        crumbs={[{ label: "Home", href: "/" }, { label: "Blog" }]}
        sub="Beginner guides, product reviews, competition updates, maintenance how-tos and training tips — straight from the VSK team."
      />

      <section className="section--tight" style={{ padding: "34px 0 80px" }}>
        <div className="wrap">
          {featured && (
            <Link
              href={`/blog/${featured.slug}`}
              className="card stack-sm"
              style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", overflow: "hidden", marginBottom: 36, alignItems: "stretch" }}
            >
              <MediaImage className="h-full min-h-[340px] w-full" alt={featured.title} placeholder={featured.category ?? "Featured article"} />
              <div style={{ padding: 40, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--blue)" }}>
                  {featured.category ?? "Featured"} · Featured
                </span>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 34, textTransform: "uppercase", letterSpacing: "-.01em", lineHeight: 1.04, margin: "14px 0" }}>
                  {featured.title}
                </h2>
                {featured.excerpt && <p style={{ color: "var(--steel)", fontSize: 16, lineHeight: 1.6 }}>{featured.excerpt}</p>}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 22 }}>
                  <span className="btn btn--primary btn--sm">Read Article</span>
                  <span className="mono-tag">{meta(featured.readTime, featured.publishedAt)}</span>
                </div>
              </div>
            </Link>
          )}

          <div className="filterbar" style={{ display: "flex", marginBottom: 26 }}>
            {CHIPS.map((c, i) => (
              <span key={c} className={`fb-chip${i === 0 ? " active" : ""}`}>{c}</span>
            ))}
          </div>

          <div className="blog">
            {rest.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="post">
                <MediaImage className="h-[200px] w-full" alt={p.title} placeholder={p.category ?? "Blog image"} />
                <div className="post__body">
                  {p.category && <span className="post__cat">{p.category}</span>}
                  <h3 className="post__t">{p.title}</h3>
                  {p.excerpt && <p className="post__ex">{p.excerpt}</p>}
                  <span className="post__meta">{meta(p.readTime, p.publishedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
