import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHead, Crumb, Panel, Badge, Av, ago } from "../../_lib/ui";
import { updateEvent, updateEventRegistration } from "../actions";
import { EventMediaManager } from "../EventMediaManager";

export const metadata = { title: "Event — VSK Admin" };

const REG_TONE: Record<string, [string, string]> = {
  PENDING: ["b-amber", "Pending"],
  CONFIRMED: ["b-green", "Confirmed"],
  CANCELLED: ["b-red", "Cancelled"],
  WAITLIST: ["b-gray", "Waitlist"],
};

export default async function AdminEventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { registrations: { include: { user: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!event) notFound();

  return (
    <div>
      <Crumb items={[["Events", "/admin/events"], [event.title]]} />
      <PageHead
        title={event.title}
        sub={`${event.registrations.length} registration${event.registrations.length === 1 ? "" : "s"}${event.capacity ? ` · capacity ${event.capacity}` : ""}`}
        actions={
          <button form="event-form" className="btn btn--primary btn--sm">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
            Save Event
          </button>
        }
      />

      <div className="od-grid">
        <Panel title="Registrations" pad={false}>
          <div style={{ overflowX: "auto" }}>
            <table className="dtbl">
              <thead>
                <tr><th>Participant</th><th>Phone</th><th>Discipline</th><th>Registered</th><th>Status</th><th style={{ textAlign: "right" }}>Update</th></tr>
              </thead>
              <tbody>
                {event.registrations.length === 0 && (
                  <tr><td colSpan={6} className="muted">No registrations yet.</td></tr>
                )}
                {event.registrations.map((r) => {
                  const [tone, label] = REG_TONE[r.status];
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="cell-cust">
                          <Av name={r.name} />
                          <span>
                            <b style={{ fontWeight: 600, display: "block" }}>{r.name}</b>
                            <span className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{r.category ?? r.user?.email ?? "—"}</span>
                          </span>
                        </span>
                      </td>
                      <td className="muted" style={{ color: "var(--ink-2)" }}>{r.phone}</td>
                      <td style={{ color: "var(--ink-2)" }}>{r.discipline ?? "—"}</td>
                      <td className="muted" style={{ color: "var(--ink-2)" }}>{ago(r.createdAt)}</td>
                      <td><Badge tone={tone}>{label}</Badge></td>
                      <td>
                        <form action={updateEventRegistration}>
                          <input type="hidden" name="id" value={r.id} />
                          <div className="row-act" style={{ gap: 6, alignItems: "center" }}>
                            <select
                              name="status"
                              defaultValue={r.status}
                              style={{ height: 30, border: "1px solid var(--line-2)", borderRadius: 6, fontSize: 12.5, padding: "0 6px" }}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="CONFIRMED">Confirmed</option>
                              <option value="WAITLIST">Waitlist</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                            <button className="btn btn--ghost btn--sm" style={{ padding: "5px 10px" }}>Set</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Edit Event">
          <form id="event-form" action={updateEvent}>
            <input type="hidden" name="id" value={event.id} />
            <div className="afield">
              <label>Title <span className="req">*</span></label>
              <input name="title" required defaultValue={event.title} />
            </div>
            <div className="afield">
              <label>Slug</label>
              <input name="slug" defaultValue={event.slug} />
            </div>
            <div className="afield--row">
              <div className="afield">
                <label>Date</label>
                <input name="date" defaultValue={event.date} />
              </div>
              <div className="afield">
                <label>Venue</label>
                <input name="location" defaultValue={event.location ?? ""} />
              </div>
            </div>
            <div className="afield--row">
              <div className="afield">
                <label>Category</label>
                <input name="category" defaultValue={event.category ?? ""} />
              </div>
              <div className="afield">
                <label>Capacity</label>
                <input name="capacity" defaultValue={event.capacity ?? ""} />
              </div>
            </div>
            <div className="afield">
              <label>Prize pool (₹)</label>
              <div className="input-prefix"><span>₹</span><input name="prizePoolInr" defaultValue={event.prizePoolInr ?? ""} /></div>
            </div>
            <div className="afield">
              <label>Status</label>
              <div className="statuspick">
                {(["UPCOMING", "LIVE", "PAST"] as const).map((s) => (
                  <label key={s}>
                    <input type="radio" name="status" value={s} defaultChecked={event.status === s} />
                    <span className="sp">{s[0] + s.slice(1).toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </div>
          </form>
        </Panel>
      </div>

      <EventMediaManager kind="event" id={event.id} imageUrl={event.imageUrl} />
    </div>
  );
}
