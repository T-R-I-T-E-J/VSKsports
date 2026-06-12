// Dev-only preview of the four transactional email templates so they can be
// visually verified against design_handoff_vsk_sports/Email-Templates.html.
// Each template renders in a sandboxed iframe (emails are standalone HTML).

import { notFound } from "next/navigation";
import { orderConfirmation, shippingUpdate, welcome, reviewRequest } from "@/lib/email/templates";

export const metadata = { title: "Email Templates (dev)" };

const sampleOrder = {
  number: "VSK-2026-0418",
  createdAt: new Date("2026-06-08"),
  subtotalInr: 196350,
  gstInr: 35343,
  shippingInr: 0,
  totalInr: 231693,
  items: [
    { name: "Walther LG400 Alutec", variantLabel: ".177", quantity: 1, unitPriceInr: 184500 },
    { name: "RWS R10 Pellets ×5", variantLabel: "8.2gr", quantity: 5, unitPriceInr: 1450 },
  ],
};

export default function DevEmailsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const samples: { label: string; subject: string; html: string }[] = [
    { label: "Order Confirmation", ...orderConfirmation(sampleOrder, { name: "Aarav Deshmukh" }) },
    {
      label: "Shipping Update",
      ...shippingUpdate(
        { number: "VSK-2026-0417" },
        "77294466120",
        "VSK Insured Logistics",
        { name: "Aarav Deshmukh" },
        "Delivering to 22 Shanti Nagar, Nagpur 440010",
      ),
    },
    { label: "Welcome", ...welcome({ name: "Aarav Deshmukh" }) },
    {
      label: "Review Request",
      ...reviewRequest({ name: "Aarav Deshmukh" }, { name: "Walther LG400 Alutec", slug: "walther-lg400-alutec" }),
    },
  ];

  return (
    <main style={{ background: "#edf1f8", minHeight: "100vh", padding: "40px 16px 80px", fontFamily: "var(--font-sans)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 30, textTransform: "uppercase" }}>
          Transactional Emails
        </h1>
        <p style={{ color: "#56627a", fontSize: 14, margin: "8px 0 30px" }}>
          Dev-only preview — these are the exact HTML strings the mailer sends. Compare against
          Email-Templates.html in the design handoff.
        </p>
        {samples.map((s) => (
          <section key={s.label} style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, textTransform: "uppercase", marginBottom: 4 }}>
              {s.label}
            </h2>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8b96ab", marginBottom: 10 }}>
              Subject: {s.subject}
            </p>
            <iframe
              title={s.label}
              srcDoc={s.html}
              style={{ width: "100%", height: 760, border: "1px solid #d2d9e6", borderRadius: 14, background: "#fff" }}
            />
          </section>
        ))}
      </div>
    </main>
  );
}
