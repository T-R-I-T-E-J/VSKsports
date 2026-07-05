import Link from "next/link";
import { PageHeader } from "@/components/storefront/PageHeader";
import { MediaImage } from "@/components/motifs/MediaImage";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Compare" };

// Three real products to compare (the Walther match-rifle line). Header data
// (image, brand, name, price) is pulled live from the DB; the spec ROWS below
// are illustrative — the Product model doesn't store per-unit specs yet.
const COMPARE_SLUGS = [
  "walther-lg500-anatomic",
  "walther-lg400-anatomic",
  "walther-lg400-monotec",
];

const ROWS: [string, string, string, string][] = [
  ["Calibre", ".177 / 4.5mm", ".177 / 4.5mm", ".177 / 4.5mm"],
  ["Power System", "PCP · 200 bar", "PCP · 200 bar", "PCP · 200 bar"],
  ["Discipline", "10m Air Rifle", "10m Air Rifle", "10m Air Rifle"],
  ["Trigger", "Match, adjustable", "Match, adjustable", "Match, adjustable"],
  ["Stock", "Anatomic", "Anatomic", "Carbon Monotec"],
  ["Skill Level", "Professional", "Professional", "Professional"],
  ["Warranty", "2 years", "2 years", "2 years"],
  ["In Stock", "yes", "yes", "yes"],
];

const cell = (v: string) =>
  v === "yes" ? <span className="yes">✓ Yes</span> : v === "no" ? <span className="no">— No</span> : v;

export default async function ComparePage() {
  const rows = await prisma.product.findMany({
    where: { slug: { in: COMPARE_SLUGS } },
    select: {
      slug: true,
      name: true,
      priceInr: true,
      brand: { select: { name: true } },
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
    },
  });
  const bySlug = new Map(rows.map((p) => [p.slug, p]));
  const cols = COMPARE_SLUGS.map((s) => bySlug.get(s)).filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <>
      <PageHeader
        title="Compare Rifles"
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: "Compare" }]}
        sub="Three competition air rifles side by side — find the right fit before you commit."
      />

      <section className="section--tight" style={{ padding: "34px 0 80px" }}>
        <div className="wrap">
          <div className="card compare" style={{ padding: 0, overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th className="feat" style={{ background: "#fff", borderBottom: "none" }} />
                  {cols.map((c) => (
                    <th className="pcol" key={c.slug}>
                      <MediaImage
                        className="mb-3 h-[150px] w-full rounded-[8px] border border-line"
                        src={c.images?.[0]?.url}
                        alt={c.name}
                        placeholder={c.brand?.name ?? "VSK"}
                      />
                      <span className="pbrand">{c.brand?.name ?? "VSK"}</span>
                      <div className="pname">{c.name}</div>
                      <div className="pprice">{formatINR(c.priceInr)}</div>
                      <Link href={`/product/${c.slug}`} className="btn btn--primary btn--sm" style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>View</Link>
                      <div className="rm" style={{ marginTop: 8, textAlign: "center" }}>✕ Remove</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([feat, a, b, c]) => (
                  <tr key={feat}>
                    <td className="feat">{feat}</td>
                    <td>{cell(a)}</td>
                    <td>{cell(b)}</td>
                    <td>{cell(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mono-tag" style={{ marginTop: 16 }}>Tip: add items to compare from any product or category page.</p>
        </div>
      </section>
    </>
  );
}
