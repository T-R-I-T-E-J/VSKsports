import type { OrderStatus } from "@prisma/client";

/* ---------- date helpers ---------- */

export const fmtDate = (d: Date): string =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);

export const fmtMonthYear = (d: Date): string =>
  new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(d);

export function relativeTime(d: Date): string {
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return fmtDate(d);
}

/* ---------- order status ---------- */

export const TRACK_STAGES: { status: OrderStatus; label: string }[] = [
  { status: "PAID", label: "Confirmed" },
  { status: "PROCESSING", label: "Packed" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { status: "DELIVERED", label: "Delivered" },
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  PAID: "Confirmed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

const stageIndex = (status: OrderStatus): number => {
  const i = TRACK_STAGES.findIndex((s) => s.status === status);
  if (i >= 0) return i;
  if (status === "PENDING") return -1;
  return -2; // cancelled / returned — no live stage
};

const CheckSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
    <path d="M5 13l4 4L19 7" />
  </svg>
);

/** The .track stepper (Confirmed → Packed → Shipped → Out for Delivery → Delivered). */
export function TrackStepper({ status }: { status: OrderStatus }) {
  const idx = stageIndex(status);
  const delivered = status === "DELIVERED";
  return (
    <div className="track">
      {TRACK_STAGES.map((stage, i) => {
        const done = delivered || i < idx;
        const cur = !delivered && i === idx;
        return (
          <div key={stage.status} className={`track__step${done ? " done" : ""}${cur ? " cur" : ""}`}>
            <div className="track__dot">{done && <CheckSvg />}</div>
            <div className="track__lab">{stage.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Status chip matching the reference colour coding. */
export function StatusChip({ status }: { status: OrderStatus }) {
  const label = STATUS_LABELS[status];
  if (status === "OUT_FOR_DELIVERY" || status === "SHIPPED") {
    return (
      <span className="chip chip--live">
        <span className="dot" />
        {label}
      </span>
    );
  }
  if (status === "DELIVERED") {
    return (
      <span className="chip" style={{ background: "#E4F7EC", color: "#1FA855" }}>
        {label}
      </span>
    );
  }
  if (status === "CANCELLED" || status === "RETURNED") {
    return (
      <span className="chip" style={{ background: "var(--red-wash)", color: "var(--red)" }}>
        {label}
      </span>
    );
  }
  return (
    <span className="chip chip--sale" style={{ background: "#FDF3DC", color: "#A9781A" }}>
      {label}
    </span>
  );
}

/** Initials for the avatar disc, e.g. "Aarav Deshmukh" -> "AD". */
export const initials = (name?: string | null): string =>
  (name ?? "VSK Customer")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** "Aarav D." style short name used across the references. */
export const shortName = (name?: string | null): string => {
  const parts = (name ?? "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Member";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
};

/* ---------- loyalty tiers ---------- */

export const TIERS = [
  { key: "BRONZE", label: "Bronze", min: 0, max: 999, color: "#B06A3B" },
  { key: "SILVER", label: "Silver", min: 1000, max: 1999, color: "#7B8794" },
  { key: "GOLD", label: "Gold", min: 2000, max: 2999, color: "#C8961E" },
  { key: "PLATINUM", label: "Platinum", min: 3000, max: Infinity, color: "#5B6CE0" },
] as const;

export function tierProgress(points: number, tier: string) {
  const i = TIERS.findIndex((t) => t.key === tier);
  const cur = TIERS[i >= 0 ? i : 0];
  const next = TIERS[Math.min((i >= 0 ? i : 0) + 1, TIERS.length - 1)];
  const isTop = cur.key === "PLATINUM";
  const span = isTop ? 1 : next.min - cur.min;
  const pct = isTop ? 100 : Math.max(4, Math.min(100, Math.round(((points - cur.min) / span) * 100)));
  const toNext = isTop ? 0 : Math.max(0, next.min - points);
  return { cur, next, pct, toNext, isTop };
}
