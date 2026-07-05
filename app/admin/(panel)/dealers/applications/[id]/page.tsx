import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHead, Crumb, Panel, Badge, Av, InfoRow, ago } from "../../../_lib/ui";
import { approveDealerApplication, rejectDealerApplication } from "../../actions";

export const metadata = { title: "Dealer Application — VSK Admin" };

export default async function DealerApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await prisma.dealerApplication.findUnique({
    where: { id },
    include: {
      user: true,
      reviewedBy: true,
      documents: { include: { file: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!app) notFound();

  const statusBadge =
    app.status === "PENDING" ? (
      <Badge tone="b-amber">Pending Review</Badge>
    ) : app.status === "APPROVED" ? (
      <Badge tone="b-green">Approved</Badge>
    ) : (
      <Badge tone="b-red">Rejected</Badge>
    );

  return (
    <div>
      <Crumb items={[["Dealers", "/admin/dealers"], [`Application · ${app.business}`]]} />
      <PageHead
        title={app.business}
        badge={statusBadge}
        sub={`Application submitted ${ago(app.createdAt)}${app.reviewedAt ? ` · reviewed ${ago(app.reviewedAt)} by ${app.reviewedBy?.name ?? "staff"}` : ""}`}
        actions={
          app.status === "PENDING" ? (
            <>
              <button
                form="reject-form"
                className="btn btn--ghost btn--sm"
                style={{ color: "var(--red)", borderColor: "var(--red-wash)" }}
              >
                Reject
              </button>
              <button form="approve-form" className="btn btn--primary btn--sm">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
                Approve Dealer
              </button>
            </>
          ) : undefined
        }
      />

      <div className="od-grid">
        {/* LEFT */}
        <div style={{ display: "grid", gap: 16 }}>
          <Panel title="Business Details">
            <InfoRow k="Business name" v={app.business} />
            <InfoRow k="Business type" v={app.businessType ?? "—"} />
            <InfoRow k="Years in business" v={app.yearsInBusiness ?? "—"} />
            <InfoRow k="GST number" v={<span style={{ fontFamily: "var(--font-mono)" }}>{app.gstNumber ?? "—"}</span>} />
            <InfoRow k="Location" v={[app.city, app.state].filter(Boolean).join(", ") || "—"} />
            <InfoRow k="Linked account" v={app.user ? app.user.email : "No account on file"} />
          </Panel>

          <Panel title="About the Business">
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink-2)" }}>
              {app.message ?? "No message provided."}
            </p>
          </Panel>

          <Panel title="Documents">
            {app.documents.length === 0 ? (
              <p style={{ fontSize: 13.5, color: "var(--mute)", margin: 0 }}>
                No documents were submitted with this application.
              </p>
            ) : (
              <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
                {app.documents.map((doc) => {
                  const filename = doc.label ?? doc.file?.key.split("/").pop() ?? "Document";
                  return (
                    <li key={doc.id}>
                      <a
                        href={`/api/files/${doc.fileId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--ghost btn--sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, maxWidth: "100%" }}
                      >
                        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <path d="M14 2v6h6" />
                        </svg>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{filename}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {app.status !== "PENDING" && (
            <Panel title="Review Outcome">
              <InfoRow k="Status" v={statusBadge} />
              {app.terms && <InfoRow k="Terms" v={app.terms} />}
              {app.reviewNotes && <InfoRow k="Notes" v={app.reviewNotes} />}
            </Panel>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ display: "grid", gap: 16 }}>
          <Panel title="Contact Person">
            <div className="cell-cust" style={{ marginBottom: 14 }}>
              <Av name={app.contactName} size={42} tone="amber" />
              <div>
                <b style={{ fontWeight: 700 }}>{app.contactName}</b>
                <div className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)" }}>Owner</div>
              </div>
            </div>
            <InfoRow k="Phone" v={app.phone ?? "—"} />
            <InfoRow k="Email" v={app.email} />
          </Panel>

          {app.status === "PENDING" && (
            <>
              <Panel title="Set Terms">
                <form id="approve-form" action={approveDealerApplication}>
                  <input type="hidden" name="id" value={app.id} />
                  <div className="afield">
                    <label>Dealer tier</label>
                    <div className="statuspick">
                      {(["STANDARD", "GOLD", "PLATINUM"] as const).map((t, i) => (
                        <label key={t}>
                          <input type="radio" name="tier" value={t} defaultChecked={i === 0} />
                          <span className="sp">{t[0] + t.slice(1).toLowerCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="afield">
                    <label>Margin</label>
                    <select name="marginPct" defaultValue="30">
                      <option value="25">25%</option>
                      <option value="30">30%</option>
                      <option value="32">32%</option>
                      <option value="38">38%</option>
                    </select>
                  </div>
                  <div className="afield">
                    <label>Credit terms</label>
                    <select name="credit" defaultValue="Prepaid">
                      <option>Prepaid</option>
                      <option>NET 15</option>
                      <option>NET 30</option>
                    </select>
                  </div>
                  <div className="afield">
                    <label>Credit limit (₹)</label>
                    <div className="input-prefix">
                      <span>₹</span>
                      <input name="creditLimitInr" placeholder="optional" />
                    </div>
                  </div>
                  <div className="afield" style={{ marginBottom: 0 }}>
                    <label>Territory</label>
                    <input name="territory" defaultValue={[app.city, app.state].filter(Boolean).join(", ")} />
                  </div>
                </form>
              </Panel>

              <Panel title="Internal Note">
                <form id="reject-form" action={rejectDealerApplication}>
                  <input type="hidden" name="id" value={app.id} />
                  <div className="afield" style={{ marginBottom: 0 }}>
                    <textarea name="reviewNotes" placeholder="Add a note for the team… (saved on reject)" style={{ minHeight: 80 }} />
                  </div>
                </form>
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
