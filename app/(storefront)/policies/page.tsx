import { PageHeader } from "@/components/storefront/PageHeader";
import { PoliciesNav } from "./PoliciesNav";

export const metadata = {
  title: "Policies & Legal",
  description:
    "VSK Sports terms of service, privacy policy, shipping, returns and refunds, and air-sport compliance information for India.",
};

const LAST_UPDATED = "13 June 2026";

type Block =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "note"; text: string; tone?: "blue" | "red" }
  | { type: "contact"; label: string; email: string };

type Policy = {
  id: string;
  label: string; // side-nav label
  eyebrow: string;
  eyebrowRed?: boolean;
  title: string;
  blocks: Block[];
};

const POLICIES: Policy[] = [
  {
    id: "terms",
    label: "Terms of Service",
    eyebrow: "Terms",
    title: "Terms of Service",
    blocks: [
      {
        type: "p",
        text: "Welcome to VSK Sports. These Terms of Service (“Terms”) govern your access to and use of vsksports.in (the “Site”) and any purchase you make from us. The Site is operated by [VSK Sports legal entity name], a business registered in India ([CIN / firm registration no.], GSTIN [GSTIN]) with its registered office at [registered address]. By accessing the Site, creating an account, or placing an order, you agree to be bound by these Terms.",
      },
      { type: "h3", text: "Eligibility and age" },
      {
        type: "p",
        text: "You must be at least 18 years of age and capable of entering into a legally binding contract under the Indian Contract Act, 1872 to purchase from us. By placing an order you confirm that you meet this requirement. We do not knowingly sell to minors, and we may require proof of age or identity before dispatching certain products.",
      },
      { type: "h3", text: "Your account" },
      {
        type: "p",
        text: "You are responsible for keeping your login credentials confidential and for all activity under your account. Tell us immediately at support@vsksports.in if you suspect unauthorised use. We may suspend or close accounts that breach these Terms or applicable law.",
      },
      { type: "h3", text: "Products, pricing and GST" },
      {
        type: "p",
        text: "All prices are shown in Indian Rupees (INR) and are inclusive of Goods and Services Tax (GST) at the applicable rate (currently 5%) unless stated otherwise. A GST tax invoice is issued for every order. We make reasonable efforts to display accurate prices, specifications and availability, but errors can occur; where a product is listed at a clearly incorrect price we may cancel the order and refund any amount paid.",
      },
      { type: "h3", text: "Orders and acceptance" },
      {
        type: "p",
        text: "Placing an order is an offer to buy. A binding contract is formed only when we confirm dispatch of the items. We may accept, refuse, limit or cancel any order at our discretion — including where stock is unavailable, where we cannot verify your details, where a product is restricted in your location, or where we suspect fraud or resale in breach of these Terms.",
      },
      { type: "h3", text: "Acceptable use" },
      {
        type: "p",
        text: "Products sold on the Site are intended for lawful sport, training, target practice and recreational use only. You agree not to use the Site or any product for any unlawful purpose, and you accept sole responsibility for using, storing and transporting products in compliance with all applicable central and state laws. Misuse of any product is solely the buyer's responsibility.",
      },
      { type: "h3", text: "Intellectual property" },
      {
        type: "p",
        text: "All content on the Site — including text, logos, graphics, photographs, the “VSK Sports” name and product imagery — is owned by or licensed to us and protected under the Copyright Act, 1957 and the Trade Marks Act, 1999. You may not copy, reproduce or reuse it without our prior written consent.",
      },
      { type: "h3", text: "Limitation of liability" },
      {
        type: "p",
        text: "To the maximum extent permitted by law, VSK Sports is not liable for any indirect, incidental or consequential loss arising from your use of the Site or products, including injury or damage resulting from misuse, improper handling or failure to follow safety guidance. Our total liability for any claim is limited to the amount you paid for the product giving rise to the claim. Nothing in these Terms excludes liability that cannot be excluded under Indian law, including under the Consumer Protection Act, 2019.",
      },
      { type: "h3", text: "Governing law and jurisdiction" },
      {
        type: "p",
        text: "These Terms are governed by the laws of India. Subject to your consumer-protection rights, the courts at [city, state] have exclusive jurisdiction over any dispute. Please contact our grievance team first so we can try to resolve any issue quickly.",
      },
      { type: "h3", text: "Changes to these Terms" },
      {
        type: "p",
        text: "We may update these Terms from time to time. The version published on this page applies to your use of the Site. Material changes take effect when posted, and your continued use of the Site means you accept them.",
      },
    ],
  },
  {
    id: "privacy",
    label: "Privacy Policy",
    eyebrow: "Privacy",
    title: "Privacy Policy",
    blocks: [
      {
        type: "p",
        text: "VSK Sports respects your privacy. This Privacy Policy explains what personal data we collect, how we use and protect it, and the rights you have under the Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000 and the rules made under it. By using the Site you consent to the practices described here. We never sell your personal data.",
      },
      { type: "h3", text: "Data we collect" },
      {
        type: "ul",
        items: [
          "Identity and contact details — your name, email, phone number and delivery/billing address.",
          "Order and transaction data — products purchased, GST invoice details and payment status. We do not store full card numbers; payments are handled by our PCI-DSS-compliant gateway (Razorpay).",
          "Account data — login credentials (stored only in hashed form), saved addresses, wishlists and preferences.",
          "Age and identity documents, where these are required to sell a particular product lawfully.",
          "Technical and usage data — IP address, device and browser type and pages visited, collected through cookies and similar technologies.",
        ],
      },
      { type: "h3", text: "How we use your data" },
      {
        type: "p",
        text: "We process your data to fulfil and deliver orders, issue GST invoices, provide support, manage returns and warranties, verify eligibility for age-restricted products, prevent fraud, meet our legal obligations, and — only with your consent — send you news about products and events. You can withdraw marketing consent at any time without affecting earlier processing.",
      },
      { type: "h3", text: "Sharing your data" },
      {
        type: "p",
        text: "We share data only as needed: with logistics partners to deliver your order, with our payment gateway to process payments, and with service providers who help us run the Site — all under confidentiality obligations. We may disclose data where required by law or a valid legal request.",
      },
      { type: "h3", text: "Data retention" },
      {
        type: "p",
        text: "We keep personal data only for as long as needed to provide our services and to meet legal, tax and accounting requirements (for example, invoice and GST records are kept for the statutory period). When data is no longer required we delete or anonymise it.",
      },
      { type: "h3", text: "Your rights" },
      {
        type: "ul",
        items: [
          "Access the personal data we hold about you and a summary of how it is processed.",
          "Request correction or completion of inaccurate or incomplete data.",
          "Request erasure of your data where it is no longer required.",
          "Withdraw consent and opt out of marketing at any time.",
          "Nominate another person to exercise your rights in the event of death or incapacity, as provided under the DPDP Act.",
        ],
      },
      { type: "h3", text: "Cookies" },
      {
        type: "p",
        text: "We use essential cookies to keep you signed in and to remember your cart and language preference, and analytics cookies to understand and improve how the Site is used. You can control cookies in your browser settings; disabling essential cookies may affect how the Site works.",
      },
      { type: "h3", text: "Security" },
      {
        type: "p",
        text: "We use reasonable technical and organisational safeguards — including encryption in transit, hashed passwords and access controls — to protect your data. No method of transmission over the internet is completely secure, but we work to protect your information and will notify you and the relevant authority of a personal-data breach as required by law.",
      },
      { type: "h3", text: "Grievance & Data Protection Officer" },
      {
        type: "note",
        text: "Grievance Officer: [name], [VSK Sports legal entity name]. Email grievance@vsksports.in. We acknowledge and respond to data-protection requests and complaints within the timelines prescribed under applicable law.",
      },
    ],
  },
  {
    id: "shipping",
    label: "Shipping Policy",
    eyebrow: "Shipping",
    title: "Shipping Policy",
    blocks: [
      {
        type: "p",
        text: "We ship insured across India through reputable courier and logistics partners. This policy explains delivery timelines, charges and the documentation some products require.",
      },
      { type: "h3", text: "Coverage and timelines" },
      {
        type: "ul",
        items: [
          "We deliver to all 28 states and 8 union territories, subject to courier serviceability and local restrictions.",
          "Orders are processed within 1–2 business days. Standard delivery usually takes 5–7 business days; metro and express options, where available, are shown at checkout.",
          "Remote or restricted PIN codes may take longer or need extra verification.",
        ],
      },
      { type: "h3", text: "Shipping charges" },
      {
        type: "ul",
        items: [
          "Free standard shipping on orders above ₹2,000.",
          "Below that, a flat shipping fee is calculated and shown at checkout before payment.",
          "All shipments are insured against loss or damage in transit.",
        ],
      },
      { type: "h3", text: "Restricted items and documentation" },
      {
        type: "p",
        text: "Some air-sport products are regulated differently from state to state. For these items we may require proof of age and identity (such as Aadhaar, PAN or another government photo ID) and, where applicable, evidence that ownership is permitted in your state before we dispatch. Orders for restricted items to states where they are not permitted will be cancelled and refunded.",
      },
      { type: "h3", text: "Tracking and delivery" },
      {
        type: "p",
        text: "Once your order is dispatched, a tracking link is added to your account and emailed to you. Please make sure someone aged 18 or over is available to receive the parcel and, where required, to show ID for age-restricted shipments. If delivery fails after reasonable attempts, the order may be returned to us and refunded less shipping costs.",
      },
      { type: "h3", text: "Damaged or missing shipments" },
      {
        type: "p",
        text: "Please inspect your package on delivery. If it arrives damaged or tampered with, refuse it or photograph it and contact support@vsksports.in within 48 hours so we can file an insurance claim and arrange a replacement.",
      },
    ],
  },
  {
    id: "returns",
    label: "Returns & Refunds",
    eyebrow: "Returns",
    title: "Returns & Refunds",
    blocks: [
      {
        type: "p",
        text: "We want you on the line with the right gear. This policy sets out when items can be returned and how refunds are processed, in line with your rights under the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020.",
      },
      { type: "h3", text: "Return window" },
      {
        type: "p",
        text: "Unused items in their original, undamaged packaging with all tags, manuals and accessories can be returned within 7 days of delivery. Start a return from your account under Orders, or contact support@vsksports.in.",
      },
      { type: "h3", text: "Non-returnable items" },
      {
        type: "quote",
        text: "For safety and hygiene reasons, air rifles and pistols that have been fired, zeroed, or had their seals broken are non-returnable — except where the item is defective or not as described.",
      },
      {
        type: "ul",
        items: [
          "Used or test-fired air guns and gas/spring components.",
          "Opened pellets, CO2 capsules, gas cartridges and other consumables.",
          "Custom, special-order or clearance items marked non-returnable.",
          "Gift cards.",
        ],
      },
      { type: "h3", text: "Defective, damaged or wrong items" },
      {
        type: "p",
        text: "If an item arrives defective, damaged or different from what you ordered, tell us within 48 hours of delivery with photos. We will arrange a free pickup and, at your choice, repair, replacement or a full refund including original shipping.",
      },
      { type: "h3", text: "How refunds work" },
      {
        type: "p",
        text: "Once we receive and inspect your return, we email you the outcome. Approved refunds are issued to your original payment method within 5–7 business days (bank processing times may vary). Shipping charges are non-refundable unless the return is due to our error or a defective product. For Cash-on-Delivery orders, refunds are made by bank transfer or UPI to the details you provide.",
      },
      { type: "h3", text: "Warranty" },
      {
        type: "p",
        text: "Manufacturer warranties apply to eligible products as stated on the product page. Warranty claims are handled under the manufacturer's terms; our support team will help you coordinate service.",
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance & Legal",
    eyebrow: "Compliance",
    eyebrowRed: true,
    title: "Compliance & Legal",
    blocks: [
      {
        type: "note",
        tone: "red",
        text: "Air-gun laws in India vary by state and change over time. The information below is general guidance only and is not legal advice. You are responsible for confirming the rules that apply where you live before you buy.",
      },
      {
        type: "p",
        text: "VSK Sports is a GST-registered supplier committed to responsible, lawful retail of air-sport equipment. We sell products intended for target shooting, training and recreation, and we expect every customer to use them safely and within the law. We do not sell firearms or ammunition.",
      },
      { type: "h3", text: "Regulatory framework" },
      {
        type: "p",
        text: "The sale and possession of arms and certain air weapons in India are governed by the Arms Act, 1959 and the Arms Rules, 2016, together with state-level rules and notifications. Many low-powered air guns are exempt from licensing, but several states regulate or require registration of air guns, and thresholds for muzzle energy and calibre apply. We sell only products we believe comply with the applicable regulations on muzzle energy and calibre.",
      },
      { type: "h3", text: "Age and identity verification" },
      {
        type: "p",
        text: "You must be at least 18 years old to buy any air-sport product from us. We may require valid proof of age and identity before processing or dispatching an order, and we will refuse or cancel any order we cannot verify or that we believe is intended for an unlawful purpose or for resale to minors.",
      },
      { type: "h3", text: "Your responsibility as the buyer" },
      {
        type: "ul",
        items: [
          "Confirm that owning and using the product is lawful in your state and locality.",
          "Complete any registration or documentation your state requires.",
          "Store equipment securely, unloaded and away from children and unauthorised persons.",
          "Transport equipment responsibly and only as permitted by law.",
        ],
      },
      { type: "h3", text: "Safety first" },
      {
        type: "p",
        text: "Always treat every air gun as if it is loaded. Keep the muzzle pointed in a safe direction and your finger off the trigger until you are ready to shoot. Use appropriate eye protection, shoot only at proper targets in safe, designated areas with a suitable backstop, and never point an air gun at a person or animal. Read the manufacturer's manual before first use.",
      },
      {
        type: "contact",
        label: "Questions on compliance?",
        email: "compliance@vsksports.in",
      },
    ],
  },
];

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h3":
            return <h3 key={i}>{b.text}</h3>;
          case "p":
            return <p key={i}>{b.text}</p>;
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            );
          case "quote":
            return <blockquote key={i}>{b.text}</blockquote>;
          case "note":
            return (
              <div
                key={i}
                style={{
                  margin: "20px 0",
                  borderLeft: `3px solid ${b.tone === "red" ? "var(--red)" : "var(--blue)"}`,
                  background: b.tone === "red" ? "var(--red-wash)" : "var(--blue-wash)",
                  borderRadius: "0 8px 8px 0",
                  padding: "14px 18px",
                  fontSize: 14.5,
                  lineHeight: 1.6,
                  color: "var(--ink-2)",
                }}
              >
                {b.text}
              </div>
            );
          case "contact":
            return (
              <div key={i} className="cc cc--call" style={{ marginTop: 22, maxWidth: 420 }}>
                <span className="cc__ic" style={{ background: "var(--blue-wash)", color: "var(--blue)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </span>
                <div>
                  <b>{b.label}</b>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--steel)" }}>
                    {b.email}
                  </span>
                </div>
              </div>
            );
        }
      })}
    </>
  );
}

export default function PoliciesPage() {
  return (
    <>
      <PageHeader
        title="Policies & Legal"
        crumbs={[{ label: "Home", href: "/" }, { label: "Policies & Legal" }]}
        sub={`How we ship, return, protect your data and stay compliant. Last updated ${LAST_UPDATED}.`}
      />

      <section className="section--tight" style={{ padding: "34px 0 80px" }}>
        <div className="wrap">
          <div
            style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 36, alignItems: "start" }}
            className="max-[820px]:!grid-cols-1"
          >
            <PoliciesNav items={POLICIES.map((p) => ({ id: p.id, label: p.label }))} />

            <div className="article article--legal" style={{ margin: 0 }}>
              {POLICIES.map((p, idx) => (
                <div key={p.id} id={p.id} className="scroll-mt-[112px] min-[821px]:scroll-mt-24">
                  {idx > 0 && (
                    <hr style={{ margin: "40px 0", border: "none", borderTop: "1px solid var(--line)" }} />
                  )}
                  <span className={p.eyebrowRed ? "eyebrow eyebrow--red" : "eyebrow"}>{p.eyebrow}</span>
                  <h2 style={{ marginTop: 12 }}>{p.title}</h2>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mute)", marginTop: 0 }}>
                    Last updated {LAST_UPDATED}
                  </p>
                  <Blocks blocks={p.blocks} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
