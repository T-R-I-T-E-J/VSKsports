import "./rewards.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MediaImage } from "@/components/motifs/MediaImage";
import { redeemReward } from "@/app/actions/rewards";
import { TIERS, fmtDate, initials, shortName, tierProgress } from "../account/_shared";

export const metadata = { title: "VSK Rewards" };

const nf = new Intl.NumberFormat("en-IN");

const CheckSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const TIER_PERKS: Record<string, string[]> = {
  BRONZE: ["Earn 1 pt / ₹100", "Birthday bonus", "Member-only offers"],
  SILVER: ["Everything in Bronze", "Free shipping always", "Early sale access"],
  GOLD: ["Everything in Silver", "2× points events", "Priority support"],
  PLATINUM: ["Everything in Gold", "5% off everything", "Exclusive event entry"],
};

export default async function RewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ redeemed?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const sp = await searchParams;

  const [user, rewardItems, ledger] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.rewardItem.findMany({ where: { active: true }, orderBy: { pointsCost: "asc" } }),
    prisma.rewardLedger.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  if (!user) redirect("/login");

  const points = user.loyaltyPoints;
  const tier = tierProgress(points, user.loyaltyTier);

  return (
    <>
      {/* HERO */}
      <section className="begin" style={{ padding: "54px 0" }}>
        <svg className="hero__rings" viewBox="0 0 420 420" fill="none" style={{ right: -140, left: "auto", top: -160, opacity: 0.18 }}>
          <circle cx="210" cy="210" r="80" stroke="#fff" strokeWidth="1" />
          <circle cx="210" cy="210" r="150" stroke="#fff" strokeWidth="1" />
          <circle cx="210" cy="210" r="210" stroke="#fff" strokeWidth="1" />
        </svg>
        <div className="wrap" style={{ position: "relative", zIndex: 2 }}>
          <nav className="breadcrumb" style={{ marginBottom: 14 }}>
            <Link href="/" style={{ color: "#9DB2FF" }}>Home</Link>
            <span className="sep" style={{ color: "#6678c4" }}>/</span>
            <Link href="/account/dashboard" style={{ color: "#9DB2FF" }}>Account</Link>
            <span className="sep" style={{ color: "#6678c4" }}>/</span>
            <span style={{ color: "#fff" }}>Rewards</span>
          </nav>
          <div className="split2" style={{ alignItems: "center" }}>
            <div>
              <span className="eyebrow eyebrow--light">VSK Rewards</span>
              <h1 className="h-sec" style={{ color: "#fff", fontSize: "clamp(36px,4.6vw,56px)", margin: "14px 0" }}>
                Earn points<br />every time<br />you shoot
              </h1>
              <p className="lead" style={{ color: "#B9C6E8" }}>
                Collect points on every purchase, review and event. Climb the tiers to unlock better pricing, priority access and exclusive perks.
              </p>
            </div>
            <div className="begin__kit" style={{ display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <span style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--blue)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20 }}>
                  {initials(user.name)}
                </span>
                <div>
                  <b style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, textTransform: "uppercase", display: "block" }}>
                    {shortName(user.name)}
                  </b>
                  <span className="chip chip--sale" style={{ background: "#FDF3DC", color: "#A9781A", marginTop: 4 }}>
                    {tier.cur.label} Member
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 42, color: "var(--blue)" }}>{nf.format(points)}</span>
                <span className="mono-tag">points</span>
              </div>
              <div style={{ height: 8, background: "var(--paper-3)", borderRadius: 999, overflow: "hidden", margin: "14px 0 8px" }}>
                <div style={{ height: "100%", width: `${tier.pct}%`, background: "var(--blue)", borderRadius: 999 }} />
              </div>
              <div className="mono-tag" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{tier.cur.label}</span>
                <span>{tier.isTop ? "Top tier" : `${nf.format(tier.toNext)} pts to ${tier.next.label}`}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW TO EARN */}
      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow">How to Earn</span>
              <h2 className="h-sec" style={{ fontSize: 38 }}>Points add up fast</h2>
            </div>
          </div>
          <div className="why">
            <div className="why__c">
              <div className="why__ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 2l1.5 3h9L18 2M3 6h18l-1.5 13a2 2 0 01-2 2H6.5a2 2 0 01-2-2L3 6z" /></svg></div>
              <b>Shop</b><p>1 point per ₹100 spent on any order.</p>
            </div>
            <div className="why__c">
              <div className="why__ic"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.3 6.9 1-5 4.8 1.2 6.9L12 17.8 5.9 21l1.2-6.9-5-4.8 6.9-1z" /></svg></div>
              <b>Review</b><p>50 points for every verified review.</p>
            </div>
            <div className="why__c">
              <div className="why__ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9V2h12v7a6 6 0 01-12 0z" /><path d="M9 21h6M12 15v6" /></svg></div>
              <b>Compete</b><p>200 points for entering a VSK event.</p>
            </div>
            <div className="why__c">
              <div className="why__ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg></div>
              <b>Refer</b><p>500 points when a friend&apos;s first order ships.</p>
            </div>
            <div className="why__c">
              <div className="why__ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg></div>
              <b>Birthday</b><p>250 bonus points every year.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section className="section section--alt">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow eyebrow--red">Membership Tiers</span>
              <h2 className="h-sec" style={{ fontSize: 38 }}>Climb for better perks</h2>
            </div>
          </div>
          <div className="tier-row">
            {TIERS.map((t) => (
              <div key={t.key} className={`tier${t.key === tier.cur.key ? " cur" : ""}`}>
                {t.key === tier.cur.key && <span className="tier__badge">You&apos;re here</span>}
                <div className="tier__name" style={{ color: t.color }}>{t.label}</div>
                <div className="tier__req">
                  {t.max === Infinity ? `${nf.format(t.min)}+ pts` : `${nf.format(t.min)} – ${nf.format(t.max)} pts`}
                </div>
                <div className="tier__perks">
                  {TIER_PERKS[t.key].map((perk) => (
                    <span key={perk}><CheckSvg />{perk}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REDEEM */}
      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow">Redeem Points</span>
              <h2 className="h-sec" style={{ fontSize: 38 }}>Spend your {nf.format(points)} points</h2>
            </div>
          </div>

          {sp.redeemed && (
            <div className="card card--pad" style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 12, color: "#1FA855" }}>
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>
              <b style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", fontSize: 16 }}>
                Reward redeemed — we&apos;ll be in touch with the details.
              </b>
            </div>
          )}
          {sp.error === "points" && (
            <div className="card card--pad" style={{ marginBottom: 22, color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              Not enough points for that reward yet.
            </div>
          )}

          <div className="reward-grid">
            {rewardItems.length === 0 && (
              <p className="mono-tag">The rewards catalog is being restocked — check back soon.</p>
            )}
            {rewardItems.map((r) => {
              const affordable = points >= r.pointsCost;
              return (
                <div className="reward" key={r.id}>
                  <MediaImage alt={r.title} placeholder={r.title} className="h-[150px] w-full" />
                  <div className="reward__b">
                    <b>{r.title}</b>
                    <span className="reward__cost">{nf.format(r.pointsCost)} points</span>
                    <p style={{ color: "var(--steel)", fontSize: 13.5, flex: 1 }}>{r.description ?? ""}</p>
                    {affordable ? (
                      <form action={redeemReward}>
                        <input type="hidden" name="rewardItemId" value={r.id} />
                        <button type="submit" className="btn btn--primary btn--sm" style={{ marginTop: 14, justifyContent: "center", width: "100%" }}>
                          Redeem
                        </button>
                      </form>
                    ) : (
                      <button className="btn btn--ghost btn--sm" disabled style={{ opacity: 0.5, marginTop: 14, justifyContent: "center" }}>
                        Need more points
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* LEDGER */}
      <section className="section section--alt" style={{ paddingBottom: 80 }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow">Activity</span>
              <h2 className="h-sec" style={{ fontSize: 38 }}>Points history</h2>
            </div>
          </div>
          {ledger.length === 0 ? (
            <p className="mono-tag">No points activity yet — your first order starts the meter.</p>
          ) : (
            <table className="rtable">
              <thead>
                <tr><th>Date</th><th>Activity</th><th style={{ textAlign: "right" }}>Points</th></tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 13, whiteSpace: "nowrap" }}>{fmtDate(l.createdAt)}</td>
                    <td>{l.reason}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 800, color: l.points >= 0 ? "#1FA855" : "var(--red)" }}>
                      {l.points >= 0 ? "+" : ""}{nf.format(l.points)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
