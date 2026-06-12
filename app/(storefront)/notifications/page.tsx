import "./notifications.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/account";
import { relativeTime } from "../account/_shared";
import type { NotificationType } from "@prisma/client";

export const metadata = { title: "Notifications" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "order", label: "Orders" },
  { key: "offer", label: "Offers" },
  { key: "event", label: "Events" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

const FILTER_TYPES: Record<Exclude<Filter, "all">, NotificationType[]> = {
  order: ["ORDER"],
  offer: ["PROMO", "REWARD"],
  event: ["SYSTEM", "REVIEW"],
};

const ICONS: Record<NotificationType, { bg: string; fg: string; svg: React.ReactNode }> = {
  ORDER: {
    bg: "#E4F7EC",
    fg: "#1FA855",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  PROMO: {
    bg: "#FDECEC",
    fg: "#E11D2B",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2A2 2 0 012.8 12V4.8A2 2 0 014.8 2.8H12a2 2 0 011.4.6l7.2 7.2a2 2 0 010 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  REWARD: {
    bg: "#FDF3DC",
    fg: "#C8961E",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3 6.3 6.9 1-5 4.8 1.2 6.9L12 17.8 5.9 21l1.2-6.9-5-4.8 6.9-1z" />
      </svg>
    ),
  },
  SYSTEM: {
    bg: "#EDE9FE",
    fg: "#7C3AED",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M6 9V2h12v7a6 6 0 01-12 0z" /><path d="M9 21h6M12 15v6" />
      </svg>
    ),
  },
  REVIEW: {
    bg: "var(--blue-wash)",
    fg: "var(--blue)",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const sp = await searchParams;
  const filter: Filter = (FILTERS.some((f) => f.key === sp.f) ? sp.f : "all") as Filter;

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(filter !== "all" ? { type: { in: FILTER_TYPES[filter] } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({ where: { userId, read: false } });

  return (
    <>
      <section className="page-head" style={{ paddingBottom: 0 }}>
        <div className="wrap" style={{ paddingBottom: 30 }}>
          <nav className="breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/account">Account</Link>
            <span className="sep">/</span>
            <span className="cur">Notifications</span>
          </nav>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
            <h1 className="ph-title">
              Notifications{" "}
              {unreadCount > 0 && (
                <span style={{ color: "var(--blue)", fontWeight: 600, fontSize: ".6em" }}>{unreadCount} new</span>
              )}
            </h1>
            <form action={markAllNotificationsRead}>
              <button type="submit" className="btn btn--ghost btn--sm">Mark all as read</button>
            </form>
          </div>
        </div>
      </section>

      <section className="section--tight" style={{ padding: "30px 0 80px" }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <div className="tabs">
            {FILTERS.map((f) => (
              <Link key={f.key} href={`/notifications?f=${f.key}`} className={`tab${filter === f.key ? " active" : ""}`}>
                {f.label}
              </Link>
            ))}
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            {notifications.length === 0 && (
              <div style={{ padding: 50, textAlign: "center", color: "var(--mute)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                No notifications here.
              </div>
            )}
            {notifications.map((n) => {
              const icon = ICONS[n.type];
              return (
                <form action={markNotificationRead} key={n.id} style={{ display: "contents" }}>
                  <input type="hidden" name="id" value={n.id} />
                  <button type="submit" className={`notif ${n.read ? "read" : "unread"}`}>
                    <span className="notif__ic" style={{ background: icon.bg, color: icon.fg }}>{icon.svg}</span>
                    <div className="notif__b">
                      <b>{n.title}</b>
                      {n.body && <p>{n.body}</p>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <span className="notif__t">{relativeTime(n.createdAt)}</span>
                      <span className="notif__dot" />
                    </div>
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
