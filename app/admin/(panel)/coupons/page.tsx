import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { one, type SP } from "../_lib/admin";
import { PageHead, Panel, Badge, SegLinks, SearchBox, fmtDate } from "../_lib/ui";
import { createCoupon, toggleCoupon, deleteCoupon } from "./actions";

export const metadata = { title: "Coupons — VSK Admin" };

export default async function AdminCoupons({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const seg = one(sp.f) || "all";
  const now = new Date();

  const coupons = await prisma.coupon.findMany({
    where: q ? { code: { contains: q, mode: "insensitive" } } : undefined,
    include: { _count: { select: { orders: true } } },
    orderBy: { code: "asc" },
  });

  const filtered = coupons.filter((c) => {
    const expired = c.expiresAt != null && c.expiresAt < now;
    if (seg === "active") return c.active && !expired;
    if (seg === "expired") return expired || !c.active;
    return true;
  });
  const activeCount = coupons.filter((c) => c.active && !(c.expiresAt && c.expiresAt < now)).length;

  const segHref = (s: string) => `/admin/coupons?f=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <PageHead
        title={<>Coupons &amp; Discounts</>}
        sub={`${activeCount} active campaign${activeCount === 1 ? "" : "s"}`}
      />

      <div className="adm-grid adm-grid--2">
        <Panel>
          <div className="tbl-tools">
            <SegLinks
              active={seg}
              options={[
                { label: "All", value: "all", href: segHref("all") },
                { label: "Active", value: "active", href: segHref("active") },
                { label: "Expired", value: "expired", href: segHref("expired") },
              ]}
            />
            <SearchBox placeholder="Search code" defaultValue={q} hidden={{ f: seg }} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="dtbl">
              <thead>
                <tr><th>Code</th><th>Discount</th><th className="num">Used</th><th>Expires</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="muted">No coupons match.</td></tr>
                )}
                {filtered.map((c) => {
                  const expired = c.expiresAt != null && c.expiresAt < now;
                  const [tone, label] = expired
                    ? ["b-red", "Expired"]
                    : c.active
                      ? ["b-green", "Active"]
                      : ["b-gray", "Inactive"];
                  return (
                    <tr key={c.id}>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: ".06em", background: "var(--paper-3)", padding: "4px 9px", borderRadius: 5 }}>
                          {c.code}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {c.type === "PERCENT" ? `${c.value}% off` : `${formatINR(c.value)} off`}
                        {c.minOrderInr ? (
                          <span className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11, display: "block" }}>
                            min {formatINR(c.minOrderInr)}
                          </span>
                        ) : null}
                      </td>
                      <td className="num">{c._count.orders}</td>
                      <td className="muted" style={{ color: "var(--ink-2)" }}>
                        {c.expiresAt ? fmtDate(c.expiresAt) : "Ongoing"}
                      </td>
                      <td><Badge tone={tone}>{label}</Badge></td>
                      <td>
                        <div className="row-act">
                          <form action={toggleCoupon}>
                            <input type="hidden" name="id" value={c.id} />
                            <button title={c.active ? "Deactivate" : "Activate"}>
                              {c.active ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M4.9 4.9l14.2 14.2" /></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
                              )}
                            </button>
                          </form>
                          <form action={deleteCoupon}>
                            <input type="hidden" name="id" value={c.id} />
                            <button className="del" title="Delete">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* create form */}
        <Panel title="New Coupon">
          <form action={createCoupon}>
            <div className="afield">
              <label>Coupon code <span className="req">*</span></label>
              <input
                name="code"
                required
                placeholder="BEGINNER10"
                style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".08em" }}
              />
            </div>
            <div className="afield">
              <label>Type</label>
              <div className="statuspick">
                <label>
                  <input type="radio" name="type" value="PERCENT" defaultChecked />
                  <span className="sp">Percentage</span>
                </label>
                <label>
                  <input type="radio" name="type" value="FLAT" />
                  <span className="sp">Fixed ₹</span>
                </label>
              </div>
            </div>
            <div className="afield--row">
              <div className="afield">
                <label>Value</label>
                <input name="value" required placeholder="10" />
              </div>
              <div className="afield">
                <label>Min. order (₹)</label>
                <div className="input-prefix">
                  <span>₹</span>
                  <input name="minOrderInr" placeholder="5,000" />
                </div>
              </div>
            </div>
            <div className="afield">
              <label>Expires</label>
              <input type="date" name="expiresAt" />
            </div>
            <label className="switch" style={{ margin: "4px 0 18px" }}>
              <input type="checkbox" name="active" defaultChecked />
              <span className="track"></span>
              <span className="sl">Active immediately</span>
            </label>
            <button className="btn btn--primary btn--sm" style={{ width: "100%", justifyContent: "center" }}>
              Create Coupon
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
