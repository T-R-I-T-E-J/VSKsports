import Link from "next/link";
import { Fragment } from "react";
import { FaqAccordion } from "@/components/storefront/FaqAccordion";

export const metadata = { title: "Help & Support" };

const CATS = [
  { b: "Orders & Delivery", p: "Tracking, shipping times, and delivery questions.", svg: <path d="M6 2l1.5 3h9L18 2M3 6h18l-1.5 13a2 2 0 01-2 2H6.5a2 2 0 01-2-2L3 6z" /> },
  { b: "Returns & Refunds", p: "Our policy, how to return, and refund timelines.", svg: <Fragment><path d="M21 12a9 9 0 11-6.2-8.5" /><path d="M21 3v6h-6" /></Fragment> },
  { b: "Product & Compliance", p: "Air-gun rules, calibres, and legal guidance.", svg: <Fragment><path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></Fragment> },
  { b: "Account & Payments", p: "Login, GST invoices, and payment options.", svg: <Fragment><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Fragment> },
];

const FAQ: [string, string][] = [
  ["Do you deliver across India?", "Yes — we ship insured to all 28 states. Standard delivery is 5–7 business days; express options are available at checkout. Some restricted items may require additional documentation depending on your state."],
  ["Do I get a GST invoice?", "Absolutely. Every order includes a proper GST tax invoice, which you can download anytime from your account under Downloads. Academies and institutions can request bulk billing."],
  ["What is your return policy?", "Unused items in original packaging can be returned within 7 days of delivery. Air rifles and pistols that have been fired or zeroed are non-returnable for hygiene and safety reasons. See our Returns Policy for full details."],
  ["Are air rifles legal to buy in India?", "Air rifles below the prescribed muzzle energy are legal for sport use, but rules vary by state. We only sell compliant products and advise you to check your local regulations. Our compliance page has more guidance."],
  ["Which calibre should a beginner choose?", "For target shooting, .177 is the standard and our recommendation for most beginners. Choose .22 only if hunting or pest control is your goal. Our beginner guide and team can help you decide."],
  ["Can I become a VSK dealer?", "Yes! We're always expanding our 120+ dealer network. Apply through our Dealer page — onboarding takes about 48 hours and includes wholesale pricing and marketing support."],
];

export default function HelpPage() {
  return (
    <>
      <section className="help-hero">
        <svg className="page-head__rings" viewBox="0 0 420 420" fill="none" style={{ opacity: 0.2 }}>
          <circle cx="210" cy="210" r="80" stroke="#fff" strokeWidth="1" />
          <circle cx="210" cy="210" r="150" stroke="#fff" strokeWidth="1" />
          <circle cx="210" cy="210" r="210" stroke="#fff" strokeWidth="1" />
        </svg>
        <div className="wrap">
          <h1>How can we help?</h1>
          <p>Search our help center or browse common topics. Still stuck? Our team shoots too — reach out.</p>
          <form className="searchbar" action="/search" method="get">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input name="q" placeholder="Search help articles…" />
            <button className="btn btn--primary btn--sm" style={{ flexShrink: 0 }}>Search</button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="help-cats">
            {CATS.map((c) => (
              <div className="help-cat" key={c.b}>
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>{c.svg}</svg>
                </span>
                <b>{c.b}</b>
                <p>{c.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap" style={{ maxWidth: 840 }}>
          <div className="sec-head" style={{ marginBottom: 30 }}>
            <div className="sec-head__t">
              <span className="eyebrow">Frequently Asked</span>
              <h2 className="h-sec" style={{ fontSize: 38 }}>Common questions</h2>
            </div>
          </div>
          <FaqAccordion items={FAQ} />
        </div>
      </section>

      <section className="section" id="support">
        <div className="wrap">
          <div className="sec-head">
            <div className="sec-head__t">
              <span className="eyebrow eyebrow--red">Still Need Help?</span>
              <h2 className="h-sec" style={{ fontSize: 38 }}>Talk to our team</h2>
            </div>
          </div>
          <div className="contact__cards" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            <a className="cc cc--wa" href="#">
              <span className="cc__ic"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1a8 8 0 01-2.4-1.5 9 9 0 01-1.6-2c-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5a.5.5 0 000-.5L9 6.7c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3A2.8 2.8 0 006.3 8.7c0 1.2.8 2.3 1 2.5.1.2 1.8 2.7 4.3 3.8 2.6 1.1 2.6.7 3 .7.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3z" /></svg></span>
              <div><b>WhatsApp</b><span>Fastest — instant replies</span></div>
            </a>
            <a className="cc cc--call" href="tel:+919876543210">
              <span className="cc__ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg></span>
              <div><b>Call Us</b><span>Mon–Sat, 10–7</span></div>
            </a>
            <Link className="cc cc--mail" href="/contact">
              <span className="cc__ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 6 10-6" /></svg></span>
              <div><b>Email / Form</b><span>We reply within hours</span></div>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
