import Link from "next/link";
import { PageHeader } from "@/components/storefront/PageHeader";
import {
  STOREFRONT_NAV,
  FOOTER_SHOP,
  FOOTER_COMPANY,
  FOOTER_GROW,
} from "@/lib/nav";

export const metadata = { title: "Sitemap" };

const GROUPS: { title: string; links: { label: string; href: string }[] }[] = [
  { title: "Browse", links: STOREFRONT_NAV },
  { title: "Shop", links: FOOTER_SHOP },
  { title: "Company", links: FOOTER_COMPANY },
  { title: "Grow With Us", links: FOOTER_GROW },
  {
    title: "Your Account",
    links: [
      { label: "Sign In", href: "/login" },
      { label: "Create Account", href: "/register" },
      { label: "My Account", href: "/account" },
      { label: "Cart", href: "/cart" },
      { label: "Wishlist", href: "/wishlist" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <>
      <PageHeader
        title="Sitemap"
        crumbs={[{ label: "Home", href: "/" }, { label: "Sitemap" }]}
        sub="Every corner of VSK Sports, in one place."
      />
      <section className="section">
        <div className="wrap">
          <div className="benefits stack-sm" style={{ gridTemplateColumns: "repeat(3,1fr)", alignItems: "start" }}>
            {GROUPS.map((g) => (
              <div key={g.title}>
                <h2 className="eyebrow" style={{ marginBottom: 14 }}>{g.title}</h2>
                <ul style={{ display: "grid", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="transition-colors hover:text-blue" style={{ fontSize: 15 }}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
