import Link from "next/link";
import { PageHeader } from "@/components/storefront/PageHeader";
import { MediaImage } from "@/components/motifs/MediaImage";
import { SubmitForm } from "@/components/storefront/SubmitForm";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Talk to a real shooter"
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        sub="Questions about gear, bulk orders, training or becoming a dealer? Reach us however suits you — we reply fast."
      />

      <section className="section">
        <div className="wrap">
          <div className="split2" style={{ alignItems: "start", gap: 48 }}>
            {/* left: cards + map + address */}
            <div>
              <div className="contact__cards" style={{ display: "grid", gap: 14 }}>
                <a className="cc cc--call" href="tel:+919876543210">
                  <span className="cc__ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg>
                  </span>
                  <div>
                    <b>Call Us</b>
                    <span>+91 98765 43210 · Mon–Sat, 10–7</span>
                  </div>
                </a>
                <a className="cc cc--wa" href="#">
                  <span className="cc__ic">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1a8 8 0 01-2.4-1.5 9 9 0 01-1.6-2c-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5a.5.5 0 000-.5L9 6.7c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3A2.8 2.8 0 006.3 8.7c0 1.2.8 2.3 1 2.5.1.2 1.8 2.7 4.3 3.8 2.6 1.1 2.6.7 3 .7.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3z" /></svg>
                  </span>
                  <div>
                    <b>WhatsApp</b>
                    <span>One-click chat — instant replies</span>
                  </div>
                </a>
                <a className="cc cc--mail" href="mailto:hello@vsksports.in">
                  <span className="cc__ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 6 10-6" /></svg>
                  </span>
                  <div>
                    <b>Email</b>
                    <span>hello@vsksports.in</span>
                  </div>
                </a>
              </div>

              <div className="contact__map imgframe" style={{ marginTop: 18, position: "relative" }}>
                <svg style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-100%)", zIndex: 3, color: "var(--red)" }} width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" />
                </svg>
                <MediaImage className="h-[300px] w-full" alt="VSK Sports HQ location" placeholder="Google Maps — VSK Sports HQ" />
              </div>

              <div className="card card--pad" style={{ marginTop: 18 }}>
                <b style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", fontSize: 16 }}>VSK Sports HQ</b>
                <p style={{ color: "var(--steel)", fontSize: 15, marginTop: 8 }}>
                  Unit 14, Sports Complex Road,
                  <br />
                  Andheri East, Mumbai 400069,
                  <br />
                  Maharashtra, India
                </p>
              </div>
            </div>

            {/* right: form */}
            <div className="card card--pad">
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, textTransform: "uppercase", margin: "0 0 6px" }}>Send a message</h2>
              <p style={{ color: "var(--steel)", fontSize: 15, marginBottom: 22 }}>We typically reply within a few hours during business days.</p>
              <SubmitForm style={{ display: "grid", gap: 18 }} message="Message sent! We'll get back to you shortly.">
                <div className="form-grid">
                  <div className="field"><label>Name <span className="req">*</span></label><input required /></div>
                  <div className="field"><label>Phone <span className="req">*</span></label><input placeholder="+91" required /></div>
                  <div className="field field--full"><label>Email</label><input type="email" /></div>
                  <div className="field field--full"><label>I&apos;m reaching out about</label><select><option>A product enquiry</option><option>Bulk / academy order</option><option>Training programs</option><option>Becoming a dealer</option><option>Order / delivery support</option><option>Something else</option></select></div>
                  <div className="field field--full"><label>Message <span className="req">*</span></label><textarea placeholder="How can we help?" required /></div>
                </div>
                <button className="btn btn--primary" style={{ justifyContent: "center" }}>
                  Send Message
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                </button>
              </SubmitForm>
              <div style={{ marginTop: 22, paddingTop: 22, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <b style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase" }}>Are you a dealer?</b>
                  <div className="mono-tag">Use our dedicated partner channel</div>
                </div>
                <Link href="/dealers" className="btn btn--ghost btn--sm">Dealer Enquiry</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
