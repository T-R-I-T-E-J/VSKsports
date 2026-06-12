import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Order Confirmed" };

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/order-confirmation/${id}`);
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: { items: true, address: true, user: true },
  });
  if (!order) notFound();

  const firstName = order.user?.name?.split(" ")[0] ?? "there";
  const paymentLabel = order.paymentStatus === "PAID" ? "Paid" : order.paymentStatus;
  const addr = order.address;

  return (
    <section className="section">
      <div className="wrap">
        <div className="conf">
          <div className="conf__badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1>Order Confirmed</h1>
          <p className="conf__sub">
            Thank you, {firstName}! Your order is in and we&apos;re getting it ready. A confirmation
            has been sent to your email and WhatsApp.
          </p>

          <div className="conf__card">
            <div className="conf__row">
              <span className="k">Order number</span>
              <span className="v" style={{ fontFamily: "var(--font-mono)", color: "var(--blue)" }}>
                #{order.number}
              </span>
            </div>
            <div className="conf__row">
              <span className="k">Order total</span>
              <span className="v">{formatINR(order.totalInr)}</span>
            </div>
            <div className="conf__row">
              <span className="k">Payment</span>
              <span className="v">{paymentLabel}</span>
            </div>
            {addr && (
              <div className="conf__row">
                <span className="k">Delivery to</span>
                <span className="v">
                  {addr.line1}, {addr.city} {addr.pincode}
                </span>
              </div>
            )}
            <div className="conf__row">
              <span className="k">Estimated delivery</span>
              <span className="v" style={{ color: "#1FA855" }}>5–7 business days</span>
            </div>
          </div>

          <div className="conf__steps">
            <div className="conf__step">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg></span>
              <b>Track it live</b>
              <p>Follow your order from packed to delivered in your account.</p>
            </div>
            <div className="conf__step">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 6 10-6" /></svg></span>
              <b>Check your email</b>
              <p>Invoice and order details are on the way to your inbox.</p>
            </div>
            <div className="conf__step">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6A8.4 8.4 0 0112.5 3h.5a8.48 8.48 0 018 8z" /></svg></span>
              <b>Need help?</b>
              <p>Message us on WhatsApp for any questions about your order.</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30, flexWrap: "wrap" }}>
            <Link href="/account#track" className="btn btn--primary">
              Track My Order
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
            <Link href="/shop" className="btn btn--ghost">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
