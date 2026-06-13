import Link from "next/link";
import { prisma } from "@/lib/db";
import { one, type SP } from "../_lib/admin";
import { PageHead, Panel, Badge, SearchBox, inrCompact } from "../_lib/ui";
import { createBatch } from "./actions";

export const metadata = { title: "Training — VSK Admin" };

export default async function AdminTraining({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim();

  const [batches, pendingRegs] = await Promise.all([
    prisma.trainingBatch.findMany({
      where: q ? { title: { contains: q, mode: "insensitive" } } : undefined,
      include: { _count: { select: { registrations: true } }, registrations: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.trainingRegistration.count({ where: { status: "PENDING" } }),
  ]);

  const enrolled = batches.reduce(
    (s, b) => s + b.registrations.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING").length,
    0,
  );
  const revenue = batches.reduce(
    (s, b) => s + (b.priceInr ?? 0) * b.registrations.filter((r) => r.status === "CONFIRMED").length,
    0,
  );

  return (
    <div>
      <PageHead
        title="Training"
        sub={`${batches.length} batches · ${enrolled} enrolled learners`}
      />

      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{batches.length}</div><div className="kpi__lab">Batches</div></div>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{enrolled}</div><div className="kpi__lab">Enrolled</div></div>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{pendingRegs}</div><div className="kpi__lab">Pending Approval</div></div>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{inrCompact(revenue)}</div><div className="kpi__lab">Confirmed Revenue</div></div>
      </div>

      <div className="adm-grid adm-grid--2">
        <Panel>
          <div className="tbl-tools">
            <SearchBox placeholder="Search batches" defaultValue={q} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="dtbl">
              <thead>
                <tr><th>Program</th><th>Level</th><th>Location</th><th>Starts</th><th className="num">Enrolled</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr>
              </thead>
              <tbody>
                {batches.length === 0 && (
                  <tr><td colSpan={7} className="muted">No batches yet.</td></tr>
                )}
                {batches.map((b) => {
                  const count = b._count.registrations;
                  const full = b.capacity != null && count >= b.capacity;
                  const [tone, label] = full ? ["b-red", "Full"] : ["b-green", "Open"];
                  return (
                    <tr key={b.id}>
                      <td><b style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>{b.title}</b></td>
                      <td><Badge tone="b-gray">{b.level[0] + b.level.slice(1).toLowerCase()}</Badge></td>
                      <td style={{ color: "var(--ink-2)" }}>{b.location ?? "—"}</td>
                      <td className="muted" style={{ color: "var(--ink-2)" }}>{b.date}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {count}{b.capacity ? ` / ${b.capacity}` : ""}
                      </td>
                      <td><Badge tone={tone}>{label}</Badge></td>
                      <td>
                        <div className="row-act">
                          <Link href={`/admin/training/${b.id}`} title="Roster & edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
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

        <Panel title="New Batch">
          <form action={createBatch}>
            <div className="afield">
              <label>Title <span className="req">*</span></label>
              <input name="title" required placeholder="Beginner Air Rifle Camp" />
            </div>
            <div className="afield--row">
              <div className="afield">
                <label>Starts</label>
                <input name="date" placeholder="14 Jun" />
              </div>
              <div className="afield">
                <label>Location</label>
                <input name="location" placeholder="Pune Range" />
              </div>
            </div>
            <div className="afield--row">
              <div className="afield">
                <label>Level</label>
                <select name="level" defaultValue="BEGINNER">
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>
              <div className="afield">
                <label>Duration</label>
                <input name="duration" placeholder="2 days" />
              </div>
            </div>
            <div className="afield--row">
              <div className="afield">
                <label>Price (₹)</label>
                <div className="input-prefix"><span>₹</span><input name="priceInr" placeholder="4,500" /></div>
              </div>
              <div className="afield">
                <label>Capacity</label>
                <input name="capacity" placeholder="24" />
              </div>
            </div>
            <button className="btn btn--primary btn--sm" style={{ width: "100%", justifyContent: "center" }}>
              Create Batch
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
