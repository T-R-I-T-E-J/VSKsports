import Link from "next/link";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { MediaImage } from "@/components/motifs/MediaImage";

/** Small square product thumb (replaces the prototype's <image-slot>). */
export function Thumb({
  src,
  alt,
  label,
  size = 42,
}: {
  src?: string | null;
  alt: string;
  label: string;
  size?: number;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "var(--r-sm)",
        border: "1px solid var(--line)",
        flexShrink: 0,
        overflow: "hidden",
        display: "grid",
      }}
    >
      <MediaImage
        src={src ?? undefined}
        alt={alt}
        placeholder={label}
        width={size}
        height={size}
        className="h-full w-full object-cover !p-0 text-[9px]"
      />
    </span>
  );
}

/* ---------- tiny shared UI for admin pages (admin.css classes) ---------- */

export function PageHead({
  title,
  sub,
  actions,
  badge,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="adm-page-head">
      <div className="adm-page-head__t">
        <h1 style={badge ? { display: "flex", alignItems: "center", gap: 14 } : undefined}>
          {title} {badge}
        </h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="adm-page-head__actions">{actions}</div>}
    </div>
  );
}

export function Crumb({ items }: { items: [string, string?][] }) {
  return (
    <div className="adm-crumb">
      {items.map(([label, href], i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 && <span>/</span>}
          {href ? <Link href={href}>{label}</Link> : label}
        </span>
      ))}
    </div>
  );
}

export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`badge ${tone}`}>
      <i></i>
      {children}
    </span>
  );
}

export function Panel({
  title,
  sub,
  action,
  children,
  pad = true,
  style,
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  pad?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className="panel-c" style={style}>
      {(title || action) && (
        <div className="panel-c__head">
          <div>
            <h3>{title}</h3>
            {sub && <div className="sub">{sub}</div>}
          </div>
          {action}
        </div>
      )}
      {pad ? <div className="panel-c__body">{children}</div> : children}
    </div>
  );
}

export function Av({ name, size, tone }: { name?: string | null; size?: number; tone?: "amber" }) {
  const ini =
    (name ?? "??")
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "??";
  const style: React.CSSProperties = {};
  if (size) Object.assign(style, { width: size, height: size, fontSize: size / 2.8 });
  if (tone === "amber") Object.assign(style, { background: "#FDF3DC", color: "#C8961E" });
  return (
    <span className="cell-av" style={style}>
      {ini}
    </span>
  );
}

export function InfoRow({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="inforow">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  base,
  label,
}: {
  page: number;
  total: number;
  pageSize: number;
  base: string; // e.g. "/admin/orders?status=PAID" (without &page)
  label: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const sep = base.includes("?") ? "&" : "?";
  const href = (p: number) => `${base}${sep}page=${p}`;
  const nums: number[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
  }
  const items: (number | "…")[] = [];
  nums.forEach((p, i) => {
    if (i > 0 && p - nums[i - 1] > 1) items.push("…");
    items.push(p);
  });
  return (
    <div className="adm-pag">
      <div className="adm-pag__info">
        Showing {from}–{to} of {total} {label}
      </div>
      <div className="adm-pag__btns">
        <Link href={href(Math.max(1, page - 1))} aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        {items.map((it, i) =>
          it === "…" ? (
            <a key={`e${i}`}>…</a>
          ) : (
            <Link key={it} href={href(it)} className={it === page ? "active" : undefined}>
              {it}
            </Link>
          ),
        )}
        <Link href={href(Math.min(pages, page + 1))} aria-label="Next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/** Segmented filter rendered as links (searchParams-driven). */
export function SegLinks({
  options,
  active,
}: {
  options: { label: React.ReactNode; href: string; value: string }[];
  active: string;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <Link key={o.value} href={o.href} className={o.value === active ? "active" : undefined}
          style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 13, padding: "9px 14px", borderRight: "1px solid var(--line)", color: o.value === active ? "#fff" : "var(--steel)", background: o.value === active ? "var(--ink)" : "#fff" }}>
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export function SearchBox({ name = "q", defaultValue, placeholder, hidden }: { name?: string; defaultValue?: string; placeholder: string; hidden?: Record<string, string> }) {
  return (
    <form method="GET" className="adm-search-sm">
      {hidden &&
        Object.entries(hidden).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} />
    </form>
  );
}

/* ---------- status → badge tone maps ---------- */

export const PAYMENT_TONE: Record<PaymentStatus, [string, string]> = {
  PENDING: ["b-amber", "Pending"],
  PAID: ["b-green", "Paid"],
  FAILED: ["b-red", "Failed"],
  REFUNDED: ["b-red", "Refunded"],
};

export const ORDER_TONE: Record<OrderStatus, [string, string]> = {
  PENDING: ["b-gray", "Unfulfilled"],
  PROCESSING: ["b-amber", "Processing"],
  PAID: ["b-blue", "Paid"],
  SHIPPED: ["b-blue", "Shipped"],
  OUT_FOR_DELIVERY: ["b-blue", "Out for Delivery"],
  DELIVERED: ["b-green", "Delivered"],
  CANCELLED: ["b-red", "Cancelled"],
  RETURNED: ["b-red", "Returned"],
};

export const CUSTOMER_TYPE_TONE: Record<string, [string, string]> = {
  INDIVIDUAL: ["b-blue", "Individual"],
  ACADEMY: ["b-purple", "Academy"],
  DEALER: ["b-green", "Dealer"],
};

export const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const fmtDateTime = (d: Date): string =>
  d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export const ago = (d: Date): string => {
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr${s >= 7200 ? "s" : ""} ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} day${s >= 172800 ? "s" : ""} ago`;
  return fmtDate(d);
};

/** Compact INR like the mock: ₹18.4L / ₹2.1Cr / ₹5,380 */
export const inrCompact = (n: number): string => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;
};
