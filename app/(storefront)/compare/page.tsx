import Link from "next/link";
import { PageHeader } from "@/components/storefront/PageHeader";
import { MediaImage } from "@/components/motifs/MediaImage";

export const metadata = { title: "Compare" };

const COLS = [
  { brand: "Walther", name: "LG400 Alutec", price: "₹1,84,500" },
  { brand: "Feinwerkbau", name: "800 X Match", price: "₹2,28,000" },
  { brand: "Steyr", name: "LG110 HP", price: "₹2,12,000" },
];

const ROWS: [string, string, string, string][] = [
  ["Rating", "4.9 ★ (36)", "5.0 ★ (18)", "4.9 ★ (24)"],
  ["Calibre", ".177 / 4.5mm", ".177 / 4.5mm", ".177 / 4.5mm"],
  ["Power System", "PCP · 200 bar", "PCP · 200 bar", "PCP · 200 bar"],
  ["Discipline", "10m Air Rifle", "10m Air Rifle", "10m Air Rifle"],
  ["Trigger", "Match, from 60g", "Match, from 50g", "Match, from 60g"],
  ["Stock", "Alutec aluminium", "Aluminium", "Walnut / Aluminium"],
  ["Weight", "4.4 kg", "4.3 kg", "4.5 kg"],
  ["Shots / Fill", "~400", "~450", "~420"],
  ["Skill Level", "Professional", "Professional", "Professional"],
  ["ABF Barrel System", "yes", "yes", "no"],
  ["Junior Variant", "yes", "yes", "no"],
  ["Warranty", "2 years", "2 years", "2 years"],
  ["In Stock", "yes", "yes", "yes"],
];

const cell = (v: string) =>
  v === "yes" ? <span className="yes">✓ Yes</span> : v === "no" ? <span className="no">— No</span> : v;

export default function ComparePage() {
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
                  {COLS.map((c) => (
                    <th className="pcol" key={c.name}>
                      <MediaImage className="mb-3 h-[150px] w-full rounded-[8px] border border-line" alt={c.name} placeholder={c.brand} />
                      <span className="pbrand">{c.brand}</span>
                      <div className="pname">{c.name}</div>
                      <div className="pprice">{c.price}</div>
                      <Link href="/shop" className="btn btn--primary btn--sm" style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>View</Link>
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
