import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { one, type SP } from "../_lib/admin";
import { PageHead, Panel, Badge, Av, SegLinks, SearchBox, ago } from "../_lib/ui";
import { approveReview, rejectReview } from "./actions";

export const metadata = { title: "Reviews — VSK Admin" };

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: "var(--amber)", letterSpacing: 1 }}>
      {"★".repeat(n)}
      <span style={{ color: "var(--line-2)" }}>{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

export default async function AdminReviews({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const seg = one(sp.f) || "PENDING";

  const where: Prisma.ReviewWhereInput = {};
  if (seg !== "all") where.status = seg as Prisma.ReviewWhereInput["status"];
  if (q)
    where.OR = [
      { authorName: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
      { product: { name: { contains: q, mode: "insensitive" } } },
    ];

  const [reviews, pendingCount, totalApproved, avgAgg, rejectedCount] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.review.count({ where: { status: "APPROVED" } }),
    prisma.review.aggregate({ _avg: { rating: true }, where: { status: "APPROVED" } }),
    prisma.review.count({ where: { status: "REJECTED" } }),
  ]);

  const segHref = (s: string) => `/admin/reviews?f=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const TONE: Record<string, [string, string]> = {
    PENDING: ["b-amber", "Pending"],
    APPROVED: ["b-green", "Published"],
    REJECTED: ["b-red", "Rejected"],
  };

  return (
    <div>
      <PageHead
        title="Reviews"
        sub={`${pendingCount} pending moderation · ${(avgAgg._avg.rating ?? 0).toFixed(1)} average rating`}
      />

      <div className="kpis" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28, color: "var(--amber)" }}>{(avgAgg._avg.rating ?? 0).toFixed(1)} ★</div><div className="kpi__lab">Average Rating</div></div>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{totalApproved}</div><div className="kpi__lab">Published Reviews</div></div>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{pendingCount}</div><div className="kpi__lab">Pending</div></div>
        <div className="kpi"><div className="kpi__val" style={{ fontSize: 28 }}>{rejectedCount}</div><div className="kpi__lab">Rejected</div></div>
      </div>

      <Panel>
        <div className="tbl-tools">
          <SegLinks
            active={seg}
            options={[
              { label: "Pending", value: "PENDING", href: segHref("PENDING") },
              { label: "Published", value: "APPROVED", href: segHref("APPROVED") },
              { label: "Rejected", value: "REJECTED", href: segHref("REJECTED") },
              { label: "All", value: "all", href: segHref("all") },
            ]}
          />
          <SearchBox placeholder="Search reviews" defaultValue={q} hidden={{ f: seg }} />
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {reviews.length === 0 && <p className="muted" style={{ fontSize: 14 }}>No reviews in this queue.</p>}
          {reviews.map((r) => {
            const [tone, label] = TONE[r.status];
            return (
              <div key={r.id} style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: "18px 20px", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <Av name={r.authorName} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <b style={{ fontWeight: 700 }}>{r.authorName}</b>
                      <Stars n={r.rating} />
                      <Badge tone={tone}>{label}</Badge>
                      <span className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11, marginLeft: "auto" }}>{ago(r.createdAt)}</span>
                    </div>
                    <div className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)", margin: "5px 0 8px" }}>
                      on {r.product.name}
                    </div>
                    {r.title && <b style={{ display: "block", fontSize: 14.5, marginBottom: 4 }}>{r.title}</b>}
                    <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)" }}>{r.body}</p>
                    {r.status === "PENDING" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                        <form action={approveReview}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="btn btn--primary btn--sm" style={{ padding: "7px 14px" }}>Approve</button>
                        </form>
                        <form action={rejectReview}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="btn btn--ghost btn--sm" style={{ padding: "7px 14px", color: "var(--red)", borderColor: "var(--red-wash)" }}>
                            Reject
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
