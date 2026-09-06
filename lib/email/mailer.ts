// VSK Sports — transactional mailer.
// Zero-dependency by design: in dev (no SMTP_* env) emails are "delivered" to
// the console; every send is recorded as an EmailLog row either way. A real
// SMTP/provider transport can be plugged in later behind the same interface
// without touching callers.

import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/db";
import { isProduction } from "@/lib/config";
import { alertOps } from "@/lib/alerts";
import type { EmailType } from "@prisma/client";
import {
  orderConfirmation,
  shippingUpdate,
  welcome,
  reviewRequest,
  passwordReset,
} from "@/lib/email/templates";

export type SendEmailInput = {
  to: string;
  type: EmailType;
  subject: string;
  html: string;
  orderId?: string;
};

export type SendEmailResult = { ok: boolean; logId?: string };

// ------------------------------------------------------------
// Transport interface — implement this to swap in a real provider.
// ------------------------------------------------------------
interface EmailTransport {
  name: string;
  deliver(input: SendEmailInput): Promise<void>;
}

/** Dev transport: logs a labelled summary to the server console. */
const consoleTransport: EmailTransport = {
  name: "console",
  async deliver(input) {
    console.log(
      [
        "",
        "┌──────────────────────────────────────────────",
        "│ 📧 [DEV EMAIL — console transport, not sent]",
        `│ To:      ${input.to}`,
        `│ Type:    ${input.type}`,
        `│ Subject: ${input.subject}`,
        input.orderId ? `│ Order:   ${input.orderId}` : null,
        `│ HTML:    ${input.html.length} bytes (preview at /dev/emails)`,
        "└──────────────────────────────────────────────",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  },
};

/**
 * Real SMTP transport (nodemailer). Selected when SMTP_HOST is configured.
 * The transporter is created lazily and cached for reuse. `sendEmail()` wraps
 * every send in try/catch, so a delivery failure is logged as EmailLog=FAILED
 * and never throws into checkout/webhook flows.
 */
let cachedTransporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!cachedTransporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // implicit TLS on 465; STARTTLS on 587/25
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return cachedTransporter;
}

const smtpTransport: EmailTransport = {
  name: "smtp",
  async deliver(input) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) throw new Error("SMTP_FROM (or SMTP_USER) is required to send email");
    await getTransporter().sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  },
};

/**
 * SECURITY / CORRECTNESS: the console transport must never be reachable in
 * production. It always "succeeds", so `sendEmail` recorded EmailStatus.SENT
 * for mail that was never dispatched — password resets dead-ended while the
 * EmailLog table insisted delivery had happened. Throwing here routes an
 * unconfigured production through the existing catch, which records FAILED and
 * raises an alert, so the failure is visible instead of silent.
 */
function pickTransport(): EmailTransport {
  if (process.env.SMTP_HOST) return smtpTransport;
  if (isProduction) {
    throw new Error(
      "Email is not configured: SMTP_HOST is required in production. Refusing to discard mail to the console.",
    );
  }
  return consoleTransport;
}

/**
 * Send a transactional email. ALWAYS writes an EmailLog row (SENT on success,
 * FAILED on transport error). Never throws — callers must not have their main
 * flow (checkout, webhooks) broken by email problems.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  let delivered = false;
  try {
    await pickTransport().deliver(input);
    delivered = true;
  } catch (err) {
    console.error("[mailer] transport failed:", err);
    // Undelivered transactional mail is a customer-visible failure (a reset
    // link that never arrives locks the account out), so it alerts rather than
    // only logging.
    alertOps("email.delivery_failed", {
      to: input.to,
      type: input.type,
      orderId: input.orderId ?? null,
      reason: err instanceof Error ? err.message : String(err),
    });
  }
  try {
    const log = await prisma.emailLog.create({
      data: {
        to: input.to,
        type: input.type,
        subject: input.subject,
        status: delivered ? "SENT" : "FAILED",
        orderId: input.orderId ?? null,
      },
    });
    return { ok: delivered, logId: log.id };
  } catch (err) {
    console.error("[mailer] failed to write EmailLog:", err);
    return { ok: delivered };
  }
}

// ------------------------------------------------------------
// High-level helpers
// ------------------------------------------------------------

/**
 * Load an order (items + user) and send its ORDER_CONFIRMATION email.
 * With `skipIfLogged`, does nothing when a confirmation was already logged
 * for the order (keeps webhook + checkout double-firing idempotent).
 */
export async function sendOrderConfirmationEmail(
  orderId: string,
  opts: { skipIfLogged?: boolean } = {},
): Promise<SendEmailResult> {
  try {
    if (opts.skipIfLogged) {
      const existing = await prisma.emailLog.findFirst({
        where: { orderId, type: "ORDER_CONFIRMATION" },
        select: { id: true },
      });
      if (existing) return { ok: true, logId: existing.id };
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });
    if (!order?.user?.email) return { ok: false };
    const tpl = orderConfirmation(order, order.user);
    return sendEmail({
      to: order.user.email,
      type: "ORDER_CONFIRMATION",
      subject: tpl.subject,
      html: tpl.html,
      orderId: order.id,
    });
  } catch (err) {
    console.error("[mailer] sendOrderConfirmationEmail failed:", err);
    return { ok: false };
  }
}

/**
 * SHIPPING_UPDATE — exported for the admin order-status flow.
 * NOTE (Wave 2): not yet wired into admin pages; call this when an order is
 * marked SHIPPED with a tracking number.
 */
export async function sendShippingUpdate(
  orderId: string,
  trackingNumber: string,
  courier: string,
): Promise<SendEmailResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, address: true },
    });
    if (!order?.user?.email) return { ok: false };
    const note = order.address
      ? `Delivering to ${order.address.line1}, ${order.address.city} ${order.address.pincode}`
      : undefined;
    const tpl = shippingUpdate(order, trackingNumber, courier, order.user, note);
    return sendEmail({
      to: order.user.email,
      type: "SHIPPING_UPDATE",
      subject: tpl.subject,
      html: tpl.html,
      orderId: order.id,
    });
  } catch (err) {
    console.error("[mailer] sendShippingUpdate failed:", err);
    return { ok: false };
  }
}

/**
 * WELCOME — exported helper. NOTE (Wave 2): no registration action exists yet
 * in this codebase; wire this into the register flow when it lands.
 */
export async function sendWelcomeEmail(user: {
  email: string;
  name?: string | null;
}): Promise<SendEmailResult> {
  const tpl = welcome(user);
  return sendEmail({ to: user.email, type: "WELCOME", subject: tpl.subject, html: tpl.html });
}

/** PASSWORD_RESET — sends a one-time reset link to the user. */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  name?: string | null,
): Promise<SendEmailResult> {
  const tpl = passwordReset({ name }, resetUrl);
  return sendEmail({ to: email, type: "PASSWORD_RESET", subject: tpl.subject, html: tpl.html });
}

/** REVIEW_REQUEST — exported helper for the post-delivery flow (Wave 2). */
export async function sendReviewRequest(
  user: { email: string; name?: string | null },
  product: { name: string; slug: string },
  orderId?: string,
): Promise<SendEmailResult> {
  const tpl = reviewRequest(user, product);
  return sendEmail({
    to: user.email,
    type: "REVIEW_REQUEST",
    subject: tpl.subject,
    html: tpl.html,
    orderId,
  });
}
