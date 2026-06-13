import Link from "next/link";
import type { Prisma, EventStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { one, type SP } from "../_lib/admin";
import { PageHead, Panel, Badge, SegLinks, SearchBox } from "../_lib/ui";
import { createEvent } from "./actions";

export const metadata = { title: "Events — VSK Admin" };

const STATUS_TONE: Record<EventStatus, [string, string]> = {
  UPCOMING: ["b-blue", "Upcoming"],
  LIVE: ["b-green", "Reg. Live"],
  PAST: ["b-gray", "Completed"],
};

export default async function AdminEvents({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const seg = one(sp.f) || "all";

  const where: Prisma.EventWhereInput = {};
  if (q) where.title = { contains: q, mode: "insensitive" };
  if (["UPCOMING", "LIVE", "PAST"].includes(seg)) where.status = seg as EventStatus;

  const [events, upcoming, live] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { _count: { select: { registrations: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.event.count({ where: { status: "UPCOMING" } }),
    prisma.event.count({ where: { status: "LIVE" } }),
  ]);

  const segHref = (s: string) => `/admin/events?f=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <PageHead
        title="Events"
        sub={`${upcoming} upcoming · ${live} registration${live === 1 ? "" : "s"} live`}
      />

      <div className="adm-grid adm-grid--2">
        <Panel>
          <div className="tbl-tools">
            <SegLinks
              active={seg}
              options={[
                { label: "All", value: "all", href: segHref("all") },
                { label: "Upcoming", value: "UPCOMING", href: segHref("UPCOMING") },
                { label: "Reg. Live", value: "LIVE", href: segHref("LIVE") },
                { label: "Past", value: "PAST", href: segHref("PAST") },
              ]}
            />
            <SearchBox placeholder="Search events" defaultValue={q} hidden={{ f: seg }} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="dtbl">
              <thead>
                <tr><th>Event</th><th>Date</th><th>Venue</th><th>Category</th><th className="num">Registered</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr>
              </thead>
              <tbody>
                {events.length === 0 && (
                  <tr><td colSpan={7} className="muted">No events match.</td></tr>
                )}
                {events.map((e) => {
                  const [tone, label] = STATUS_TONE[e.status];
                  return (
                    <tr key={e.id}>
                      <td><b style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>{e.title}</b></td>
                      <td className="muted" style={{ color: "var(--ink-2)" }}>{e.date}</td>
                      <td style={{ color: "var(--ink-2)" }}>{e.location ?? "—"}</td>
                      <td><Badge tone="b-gray">{e.category ?? "—"}</Badge></td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {e._count.registrations}{e.capacity ? ` / ${e.capacity}` : ""}
                      </td>
                      <td><Badge tone={tone}>{label}</Badge></td>
                      <td>
                        <div className="row-act">
                          <Link href={`/admin/events/${e.id}`} title="Registrations & edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Create Event">
          <form action={createEvent}>
            <div className="afield">
              <label>Title <span className="req">*</span></label>
              <input name="title" required placeholder="VSK Open 10m Championship" />
            </div>
            <div className="afield--row">
              <div className="afield">
                <label>Date</label>
                <input name="date" placeholder="28 Jun" />
              </div>
              <div className="afield">
                <label>Venue</label>
                <input name="location" placeholder="Mumbai" />
              </div>
            </div>
            <div className="afield--row">
              <div className="afield">
                <label>Category</label>
                <input name="category" placeholder="Open · Pro" />
              </div>
              <div className="afield">
                <label>Capacity</label>
                <input name="capacity" placeholder="320" />
              </div>
            </div>
            <div className="afield">
              <label>Prize pool (₹)</label>
              <div className="input-prefix"><span>₹</span><input name="prizePoolInr" placeholder="optional" /></div>
            </div>
            <div className="afield">
              <label>Status</label>
              <div className="statuspick">
                {(["UPCOMING", "LIVE", "PAST"] as const).map((s, i) => (
                  <label key={s}>
                    <input type="radio" name="status" value={s} defaultChecked={i === 0} />
                    <span className="sp">{STATUS_TONE[s][1]}</span>
                  </label>
                ))}
              </div>
            </div>
            <button className="btn btn--primary btn--sm" style={{ width: "100%", justifyContent: "center" }}>
              Create Event
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
