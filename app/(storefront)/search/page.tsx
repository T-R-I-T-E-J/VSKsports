import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/commerce/ProductCard";

export const metadata = { title: "Search" };

const SUGGESTIONS = ["air rifle", ".177 pellets", "beginner kit", "electronic target", "shooting glove"];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = one(sp.q).trim();

  const products = query
    ? await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { name: { contains: query, mode: "insensitive" } } },
            { caliber: { contains: query, mode: "insensitive" } },
            { tags: { has: query } },
          ],
        },
        include: { brand: { select: { name: true } } },
        take: 24,
      })
    : [];

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
            <span className="cur">Search</span>
          </nav>
          <h1 className="ph-title" style={{ marginBottom: 20 }}>Search</h1>
          <form className="searchbar" action="/search" method="get">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input name="q" defaultValue={query} placeholder="Search rifles, pellets, targets, brands…" />
            <button className="btn btn--primary btn--sm" style={{ flexShrink: 0 }}>Search</button>
          </form>
          <div className="search-sugg">
            <span>Try:</span>
            {SUGGESTIONS.map((s) => (
              <Link key={s} href={`/search?q=${encodeURIComponent(s)}`}>{s}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section--tight" style={{ padding: "30px 0 80px" }}>
        <div className="wrap">
          <div className="toolbar">
            <div className="toolbar__count">
              {query ? (
                <>
                  Showing <b>{products.length}</b> results for &ldquo;<b>{query}</b>&rdquo;
                </>
              ) : (
                "Enter a search term above"
              )}
            </div>
          </div>
          {products.length > 0 ? (
            <div className="prods">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : query ? (
            <p className="lead">No results for &ldquo;{query}&rdquo;. Try a different term.</p>
          ) : null}
        </div>
      </section>
    </>
  );
}
