import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHead, Crumb, Panel, Badge, Av, ago } from "../../_lib/ui";
import { updateBatch, updateTrainingRegistration } from "../actions";

export const metadata = { title: "Training Batch — VSK Admin" };

const REG_TONE: Record<string, [string, string]> = {
  PENDING: ["b-amber", "Pending"],
  CONFIRMED: ["b-green", "Confirmed"],
  CANCELLED: ["b-red", "Cancelled"],
  WAITLIST: ["b-gray", "Waitlist"],
};

export default async function TrainingBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await prisma.trainingBatch.findUnique({
    where: { id },
    include: { registrations: { include: { user: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!batch) notFound();

  return (
    <div>
      <Crumb items={[["Training", "/admin/training"], [batch.title]]} />
      <PageHead
        title={batch.title}
        sub={`${batch.registrations.length} registration${batch.registrations.length === 1 ? "" : "s"}${batch.capacity ? ` · capacity ${batch.capacity}` : ""}`}
        actions={
          <button form="batch-form" className="btn btn--primary btn--sm">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
            Save Batch
          </button>
        }
      />

      <div className="od-grid">
        {/* registrations */}
        <Panel title="Registrations" pad={false}>
          <div style={{ overflowX: "auto" }}>
            <table className="dtbl">
              <thead>
                <tr><th>Learner</th><th>Phone</th><th>Experience</th><th>Registered</th><th>Status</th><th style={{ textAlign: "right" }}>Update</th></tr>
              </thead>
              <tbody>
                {batch.registrations.length === 0 && (
                  <tr><td colSpan={6} className="muted">No registrations yet.</td></tr>
                )}
                {batch.registrations.map((r) => {
                  const [tone, label] = REG_TONE[r.status];
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="cell-cust">
                          <Av name={r.name} />
                          <span>
                            <b style={{ fontWeight: 600, display: "block" }}>{r.name}</b>
                            <span className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{r.email ?? r.user?.email ?? "—"}</span>
                          </span>
                        </span>
                      </td>
                      <td className="muted" style={{ color: "var(--ink-2)" }}>{r.phone}</td>
                      <td style={{ color: "var(--ink-2)" }}>{r.experience ?? "—"}</td>
                      <td className="muted" style={{ color: "var(--ink-2)" }}>{ago(r.createdAt)}</td>
                      <td><Badge tone={tone}>{label}</Badge></td>
                      <td>
                        <form action={updateTrainingRegistration}>
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

        {/* edit batch */}
        <Panel title="Edit Batch">
          <form id="batch-form" action={updateBatch}>
            <input type="hidden" name="id" value={batch.id} />
            <div className="afield">
              <label>Title <span className="req">*</span></label>
              <input name="title" required defaultValue={batch.title} />
            </div>
            <div className="afield">
              <label>Slug</label>
              <input name="slug" defaultValue={batch.slug} />
            </div>
            <div className="afield--row">
              <div className="afield">
                <label>Starts</label>
                <input name="date" defaultValue={batch.date} />
              </div>
              <div className="afield">
                <label>Location</label>
                <input name="location" defaultValue={batch.location ?? ""} />
              </div>
            </div>
            <div className="afield--row">
              <div className="afield">
                <label>Level</label>
                <select name="level" defaultValue={batch.level}>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>
              <div className="afield">
                <label>Duration</label>
                <input name="duration" defaultValue={batch.duration ?? ""} />
              </div>
            </div>
            <div className="afield--row">
              <div className="afield">
                <label>Price (₹)</label>
                <div className="input-prefix"><span>₹</span><input name="priceInr" defaultValue={batch.priceInr ?? ""} /></div>
              </div>
              <div className="afield">
                <label>Capacity</label>
                <input name="capacity" defaultValue={batch.capacity ?? ""} />
              </div>
            </div>
            <div className="afield">
              <label>Spots note</label>
              <input name="spotsNote" defaultValue={batch.spotsNote ?? ""} placeholder="e.g. 6 spots left" />
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
