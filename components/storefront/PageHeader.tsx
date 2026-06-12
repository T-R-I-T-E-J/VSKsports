import Link from "next/link";
import { Fragment } from "react";

type Crumb = { label: string; href?: string };

/** Inner-page header band (matches the prototype's .page-head). */
export function PageHeader({
  title,
  sub,
  crumbs,
  dark = false,
  actions,
}: {
  title: string;
  sub?: string;
  crumbs?: Crumb[];
  dark?: boolean;
  actions?: React.ReactNode;
}) {
  const stroke = dark ? "#fff" : "#1B43C8";
  return (
    <section className={`page-head${dark ? " page-head--dark" : ""}`}>
      <svg className="page-head__rings" viewBox="0 0 420 420" fill="none">
        <circle cx="210" cy="210" r="70" stroke={stroke} strokeWidth="1" />
        <circle cx="210" cy="210" r="130" stroke={stroke} strokeWidth="1" strokeOpacity=".5" />
        <circle cx="210" cy="210" r="195" stroke={stroke} strokeWidth="1" strokeOpacity=".28" />
      </svg>
      <div className="wrap">
        {crumbs && crumbs.length > 0 && (
          <nav className="breadcrumb">
            {crumbs.map((c, i) => (
              <Fragment key={i}>
                {c.href ? (
                  <Link href={c.href}>{c.label}</Link>
                ) : (
                  <span className="cur">{c.label}</span>
                )}
                {i < crumbs.length - 1 && <span className="sep">/</span>}
              </Fragment>
            ))}
          </nav>
        )}
        <h1 className="ph-title">{title}</h1>
        {sub && <p className="ph-sub">{sub}</p>}
        {actions && (
          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
