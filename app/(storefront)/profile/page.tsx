import "./profile.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  changePassword,
  updateCommunicationPrefs,
  updatePrivacyPrefs,
  updateProfile,
} from "@/app/actions/account";
import { fmtMonthYear, tierProgress } from "../account/_shared";
import { AvatarUploader } from "./AvatarUploader";

export const metadata = { title: "Profile Settings" };

const SECTIONS = ["profile", "password", "comms", "privacy"] as const;
type Section = (typeof SECTIONS)[number];

const PASSWORD_ERRORS: Record<string, string> = {
  short: "New password must be at least 8 characters.",
  mismatch: "New passwords do not match.",
  wrong: "Current password is incorrect.",
  nopass: "No password is set on this account.",
};

const Check = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const h3Style: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 800,
  fontSize: 22,
  textTransform: "uppercase",
  margin: "0 0 18px",
};

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const sp = await searchParams;
  const section: Section = SECTIONS.includes(sp.s as Section) ? (sp.s as Section) : "profile";

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  const tier = tierProgress(user.loyaltyPoints, user.loyaltyTier);

  return (
    <>
      <section className="page-head" style={{ paddingBottom: 0 }}>
        <div className="wrap" style={{ paddingBottom: 30 }}>
          <nav className="breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href="/account">Account</Link>
            <span className="sep">/</span>
            <span className="cur">Profile Settings</span>
          </nav>
          <h1 className="ph-title">Profile Settings</h1>
        </div>
      </section>

      <section className="section--tight" style={{ padding: "34px 0 80px" }}>
        <div className="wrap">
          <div className="set-grid">
            <nav className="set-nav">
              <Link href="/profile?s=profile" className={section === "profile" ? "active" : undefined}>Profile</Link>
              <Link href="/profile?s=password" className={section === "password" ? "active" : undefined}>Password</Link>
              <Link href="/profile?s=comms" className={section === "comms" ? "active" : undefined}>Communication</Link>
              <Link href="/profile?s=privacy" className={section === "privacy" ? "active" : undefined}>Privacy</Link>
            </nav>

            <div>
              {section === "profile" && (
                <div className="card card--pad">
                  <AvatarUploader currentImage={user.image} name={user.name} />
                  <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}>
                    <div>
                      <b style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, textTransform: "uppercase", display: "block" }}>
                        {user.name ?? "VSK Member"}
                      </b>
                      <span className="mono-tag">{tier.cur.label} Member · since {fmtMonthYear(user.createdAt)}</span>
                    </div>
                  </div>
                  <form action={updateProfile}>
                    <div className="form-grid">
                      <div className="field"><label>Full name</label><input name="name" defaultValue={user.name ?? ""} /></div>
                      <div className="field"><label>Email</label><input type="email" defaultValue={user.email} disabled style={{ background: "var(--paper-2)", color: "var(--mute)" }} /></div>
                      <div className="field"><label>Phone</label><input name="phone" defaultValue={user.phone ?? ""} placeholder="+91" /></div>
                      <div className="field"><label>Location</label><input name="location" defaultValue={user.location ?? ""} placeholder="City, State" /></div>
                      <div className="field field--full">
                        <label className="switch" style={{ textTransform: "none" }}>
                          <input type="checkbox" name="marketingOptIn" defaultChecked={user.marketingOptIn} />
                          <span className="track" />
                          <span className="sl">Send me offers, new arrivals and event invitations</span>
                        </label>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                      <button type="submit" className="btn btn--primary">Save Changes</button>
                      <Link href="/account" className="btn btn--ghost">Cancel</Link>
                    </div>
                    {sp.saved === "profile" && (
                      <div className="fmsg" role="status"><Check />Profile updated.</div>
                    )}
                  </form>
                </div>
              )}

              {section === "password" && (
                <div className="card card--pad" style={{ maxWidth: 520 }}>
                  <h3 style={h3Style}>Change Password</h3>
                  <form action={changePassword}>
                    <div className="field" style={{ marginBottom: 16 }}>
                      <label>Current password</label>
                      <input type="password" name="current" required placeholder="••••••••" />
                    </div>
                    <div className="field" style={{ marginBottom: 16 }}>
                      <label>New password</label>
                      <input type="password" name="next" required placeholder="At least 8 characters" minLength={8} />
                    </div>
                    <div className="field" style={{ marginBottom: 18 }}>
                      <label>Confirm new password</label>
                      <input type="password" name="confirm" required placeholder="Repeat new password" />
                    </div>
                    <button type="submit" className="btn btn--primary">Update Password</button>
                    {sp.saved === "password" && (
                      <div className="fmsg" role="status"><Check />Password changed.</div>
                    )}
                    {sp.error && PASSWORD_ERRORS[sp.error] && (
                      <div className="fmsg fmsg--err" role="alert">{PASSWORD_ERRORS[sp.error]}</div>
                    )}
                  </form>
                </div>
              )}

              {section === "comms" && (
                <div className="card card--pad" style={{ maxWidth: 560 }}>
                  <h3 style={{ ...h3Style, margin: "0 0 6px" }}>Communication Preferences</h3>
                  <p style={{ color: "var(--steel)", fontSize: 14, marginBottom: 18 }}>Choose what you hear from us and how.</p>
                  <form action={updateCommunicationPrefs}>
                    <div className="inforow">
                      <span className="k">
                        <b style={{ color: "var(--ink)", fontWeight: 600, display: "block" }}>Order updates</b>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)" }}>Email + SMS · always on</span>
                      </span>
                      <label className="switch"><input type="checkbox" defaultChecked disabled /><span className="track" /></label>
                    </div>
                    <div className="inforow">
                      <span className="k">
                        <b style={{ color: "var(--ink)", fontWeight: 600, display: "block" }}>New arrivals &amp; offers</b>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)" }}>Monthly newsletter</span>
                      </span>
                      <label className="switch"><input type="checkbox" name="marketing" defaultChecked={user.marketingOptIn} /><span className="track" /></label>
                    </div>
                    <div className="inforow">
                      <span className="k">
                        <b style={{ color: "var(--ink)", fontWeight: 600, display: "block" }}>Event invitations</b>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)" }}>Competitions near you</span>
                      </span>
                      <label className="switch"><input type="checkbox" name="eventInvites" defaultChecked={user.eventInvitesOptIn} /><span className="track" /></label>
                    </div>
                    <div className="inforow">
                      <span className="k">
                        <b style={{ color: "var(--ink)", fontWeight: 600, display: "block" }}>Training reminders</b>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)" }}>Upcoming batches</span>
                      </span>
                      <label className="switch"><input type="checkbox" name="trainingReminders" defaultChecked={user.trainingRemindersOptIn} /><span className="track" /></label>
                    </div>
                    <div className="inforow" style={{ borderBottom: "none" }}>
                      <span className="k">
                        <b style={{ color: "var(--ink)", fontWeight: 600, display: "block" }}>WhatsApp updates</b>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mute)" }}>Order &amp; support</span>
                      </span>
                      <label className="switch"><input type="checkbox" name="whatsapp" defaultChecked={user.whatsappOptIn} /><span className="track" /></label>
                    </div>
                    <button type="submit" className="btn btn--primary btn--sm" style={{ marginTop: 18 }}>Save Preferences</button>
                    {sp.saved === "comms" && (
                      <div className="fmsg" role="status"><Check />Preferences saved.</div>
                    )}
                  </form>
                </div>
              )}

              {section === "privacy" && (
                <div className="card card--pad" style={{ maxWidth: 560 }}>
                  <h3 style={h3Style}>Privacy &amp; Data</h3>
                  <div className="inforow">
                    <span className="k" style={{ fontWeight: 600, color: "var(--ink)" }}>Download my data</span>
                    <Link href="/contact" className="btn btn--ghost btn--sm">Request</Link>
                  </div>
                  {/* Its own form and action: submitting the comms form would
                      read this switch as absent and silently clear it, and vice
                      versa, since an unchecked box sends nothing. */}
                  <form action={updatePrivacyPrefs}>
                    <div className="inforow">
                      <span className="k" style={{ fontWeight: 600, color: "var(--ink)" }}>Personalised recommendations</span>
                      <label className="switch"><input type="checkbox" name="personalisedRecs" defaultChecked={user.personalisedRecsOptIn} /><span className="track" /></label>
                    </div>
                    <button type="submit" className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>Save</button>
                    {sp.saved === "privacy" && (
                      <div className="fmsg" role="status"><Check />Privacy settings saved.</div>
                    )}
                  </form>
                  <div className="inforow" style={{ borderBottom: "none" }}>
                    <span className="k" style={{ fontWeight: 600, color: "var(--red)" }}>Delete my account</span>
                    <Link href="/contact" className="btn btn--ghost btn--sm" style={{ color: "var(--red)", borderColor: "var(--red-wash)" }}>Delete</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
