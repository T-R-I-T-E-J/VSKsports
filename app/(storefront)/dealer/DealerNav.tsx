import Link from "next/link";

const LINKS = [
  { href: "/dealer", label: "Dashboard" },
  { href: "/dealer/order", label: "Bulk Order" },
  { href: "/dealer/invoices", label: "Invoices & Credit" },
] as const;

/** Pill sub-nav rendered inside the dark page head on every dealer page. */
export function DealerNav({ active }: { active: string }) {
  return (
    <nav className="dnav" style={{ marginTop: 0 }}>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={l.href === active ? "active" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
