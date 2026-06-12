import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { MediaImage } from "@/components/motifs/MediaImage";

const meta = (readTime: string | null, publishedAt: string | null) =>
  [readTime ? `${readTime} read` : null, publishedAt].filter(Boolean).join(" · ");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.blogPost.findUnique({ where: { slug }, select: { title: true } });
  return { title: p?.title ?? "Article" };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) notFound();

  const more = await prisma.blogPost.findMany({
    where: { published: true, slug: { not: slug } },
    take: 3,
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <article className="section">
        <div className="wrap">
          <div className="article">
            <nav className="breadcrumb" style={{ marginBottom: 18 }}>
              <Link href="/">Home</Link>
              <span className="sep">/</span>
              <Link href="/blog">Blog</Link>
              <span className="sep">/</span>
              <span className="cur">{post.title}</span>
            </nav>
            <span className="eyebrow">{post.category ?? "Article"}</span>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(32px,4.4vw,52px)", textTransform: "uppercase", letterSpacing: "-.015em", lineHeight: 1, margin: "14px 0 18px" }}>
              {post.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 30 }}>
              <MediaImage className="h-11 w-11 rounded-full" alt="VSK Editorial" placeholder="V" />
              <div>
                <b style={{ fontFamily: "var(--font-display)", textTransform: "uppercase" }}>VSK Editorial</b>
                <div className="mono-tag">{meta(post.readTime, post.publishedAt)}</div>
              </div>
            </div>

            <div className="article__hero">
              <MediaImage className="h-[420px] w-full" alt={post.title} placeholder="Article hero image" />
            </div>

            {post.body ? (
              post.body.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
            ) : (
              <>
                <p>{post.excerpt ?? `An in-depth look at ${post.title.toLowerCase()}.`}</p>
                <h2>What you need to know</h2>
                <p>
                  Our team breaks down the essentials so you can make a confident decision — covering
                  the fundamentals, the trade-offs, and VSK&apos;s recommended picks for shooters
                  across India.
                </p>
                <blockquote>
                  &ldquo;Buy the equipment that matches where you want to be in a year — not just
                  where you are today.&rdquo;
                </blockquote>
                <h3>Talk to people who shoot</h3>
                <p>
                  Still unsure? Our team is on WhatsApp and happy to help you choose — genuine stock,
                  GST-billed, with VSK support and a 2-year warranty.
                </p>
              </>
            )}
          </div>
        </div>
      </article>

      <section className="section section--alt">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow">Keep Reading</span>
              <h2 className="h-sec" style={{ fontSize: 34 }}>Next from the range</h2>
            </div>
            <Link href="/blog" className="sec-head__link">
              All articles
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="blog">
            {more.map((p) => (
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
