// VSK Sports — transactional email templates.
// Inbox-safe HTML strings (inline styles, no CSS variables) that mirror the
// design handoff in design_handoff_vsk_sports/Email-Templates.html:
// ink header with the VSK wordmark, coloured hero band, card rows, blue CTA
// buttons and a paper footer.

import { formatINR } from "@/lib/format";

// Brand palette (resolved values of the CSS custom properties in globals.css)
const INK = "#0b0f17";
const INK_2 = "#161d2b";
const BLUE = "#1b43c8";
const BLUE_INK = "#0b1f5e";
const BLUE_WASH = "#eaf0fe";
const RED = "#e11d2b";
const PAPER_2 = "#f5f7fb";
const PAPER_3 = "#edf1f8";
const LINE = "#e3e8f1";
const STEEL = "#56627a";
const MUTE = "#8b96ab";
const GREEN = "#0E7A43";
const GREEN_OK = "#1FA855";
const AMBER = "#C8961E";

const FONT_STACK = "'Space Grotesk', 'Segoe UI', system-ui, -apple-system, sans-serif";
const MONO_STACK = "'Spline Sans Mono', ui-monospace, 'Courier New', monospace";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export type EmailTemplate = { subject: string; html: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function firstName(name?: string | null): string {
  return (name || "there").trim().split(/\s+/)[0];
}

function btn(label: string, href: string, color: string = BLUE): string {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#ffffff;font-family:${FONT_STACK};font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:14px 28px;border-radius:8px;font-size:15px;text-decoration:none;">${esc(label)}</a>`;
}

/** Shared shell: ink logo header → hero band → body → footer. */
function shell({
  hero,
  body,
  footerLinks = `<a href="${SITE_URL}/help" style="color:${BLUE};">Help</a> · <a href="#" style="color:${BLUE};">Unsubscribe</a>`,
}: {
  hero: { bg: string; icon: string; title: string; sub: string };
  body: string;
  footerLinks?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${PAPER_3};font-family:${FONT_STACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER_3};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
        <!-- logo header -->
        <tr><td style="background:${INK};padding:26px 32px;">
          <span style="display:inline-block;vertical-align:middle;width:40px;height:40px;background:#ffffff;border-radius:10px;text-align:center;line-height:40px;font-family:${FONT_STACK};font-weight:800;font-size:13px;"><span style="color:${BLUE};">V</span><span style="color:${RED};">S</span><span style="color:${INK};">K</span></span>
          <span style="display:inline-block;vertical-align:middle;margin-left:12px;font-family:${FONT_STACK};font-weight:800;font-size:20px;text-transform:uppercase;color:#ffffff;letter-spacing:.02em;">VSK Sports</span>
        </td></tr>
        <!-- hero -->
        <tr><td style="background:${hero.bg};padding:36px 32px;text-align:center;">
          <div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.14);margin:0 auto 16px;text-align:center;line-height:60px;font-size:28px;color:#ffffff;">${hero.icon}</div>
          <h1 style="margin:0;font-family:${FONT_STACK};font-weight:800;font-size:28px;text-transform:uppercase;color:#ffffff;">${esc(hero.title)}</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:15px;">${hero.sub}</p>
        </td></tr>
        <!-- body -->
        <tr><td style="padding:30px 32px;">${body}</td></tr>
        <!-- footer -->
        <tr><td style="background:${PAPER_2};padding:24px 32px;text-align:center;border-top:1px solid ${LINE};">
          <p style="font-family:${MONO_STACK};font-size:11px;color:${MUTE};line-height:1.6;margin:0;">VSK Sports · Mumbai, India · ${footerLinks}<br>© ${new Date().getFullYear()} VSK Sports. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const p = (html: string) =>
  `<p style="font-size:15px;line-height:1.6;color:${INK_2};margin:0 0 16px;">${html}</p>`;

const card = (inner: string) =>
  `<div style="border:1px solid ${LINE};border-radius:10px;overflow:hidden;margin:18px 0;">${inner}</div>`;

// ============================================================
// 1) Order confirmation
// ============================================================
export type OrderEmailItem = {
  name: string;
  variantLabel?: string | null;
  quantity: number;
  unitPriceInr: number;
};

export type OrderEmailData = {
  number: string;
  createdAt: Date;
  subtotalInr: number;
  gstInr: number;
  shippingInr: number;
  discountInr?: number;
  totalInr: number;
  items: OrderEmailItem[];
};

export function orderConfirmation(order: OrderEmailData, user: { name?: string | null }): EmailTemplate {
  const date = order.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const itemRows = order.items
    .map((i) => {
      const ph = esc(i.name.slice(0, 3).toUpperCase());
      const meta = [i.variantLabel, `Qty ${i.quantity}`].filter(Boolean).join(" · ");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="padding:13px 16px;border-bottom:1px solid ${LINE};">
          <span style="display:inline-block;vertical-align:middle;width:46px;height:46px;border-radius:8px;background:${PAPER_3};text-align:center;line-height:46px;font-family:${MONO_STACK};font-size:9px;color:${MUTE};">${ph}</span>
          <span style="display:inline-block;vertical-align:middle;margin-left:13px;">
            <b style="font-weight:600;font-size:14px;color:${INK};">${esc(i.name)}</b>
            <span style="display:block;font-family:${MONO_STACK};font-size:11px;color:${MUTE};">${esc(meta)}</span>
          </span>
        </td>
        <td align="right" style="padding:13px 16px;border-bottom:1px solid ${LINE};"><b style="font-size:14px;color:${INK};">${formatINR(i.unitPriceInr * i.quantity)}</b></td>
      </tr></table>`;
    })
    .join("");

  const row = (k: string, v: string, opts: { bg?: string; strong?: boolean } = {}) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${opts.bg ? `background:${opts.bg};` : ""}"><tr>
      <td style="padding:13px 16px;font-size:14px;color:${opts.strong ? INK : STEEL};${opts.strong ? "font-weight:700;" : ""}border-bottom:1px solid ${LINE};">${k}</td>
      <td align="right" style="padding:13px 16px;font-size:${opts.strong ? "17px" : "14px"};font-weight:600;color:${INK};border-bottom:1px solid ${LINE};">${v}</td>
    </tr></table>`;

  const totalsRows = [
    row("Subtotal", formatINR(order.subtotalInr)),
    row("Shipping", order.shippingInr === 0 ? `<span style="color:${GREEN_OK};">FREE</span>` : formatINR(order.shippingInr)),
    row("GST (18%)", formatINR(order.gstInr)),
    order.discountInr ? row("Discount", `−${formatINR(order.discountInr)}`) : "",
    row("Total", formatINR(order.totalInr), { bg: PAPER_2, strong: true }),
  ].join("");

  const body = [
    p(`Hi ${esc(firstName(user.name))},`),
    p("Thanks for your order! We're getting it ready and will let you know the moment it ships."),
    card(itemRows),
    card(totalsRows),
    `<p style="text-align:center;margin:24px 0 8px;">${btn("Track Your Order", `${SITE_URL}/orders`)}</p>`,
  ].join("");

  return {
    subject: "Your VSK order is confirmed ✓",
    html: shell({
      hero: {
        bg: `linear-gradient(150deg,${BLUE_INK},${BLUE})`,
        icon: "✓",
        title: "Order Confirmed",
        sub: `Order #${esc(order.number)} · ${esc(date)}`,
      },
      body,
    }),
  };
}

// ============================================================
// 2) Shipping update
// ============================================================
export function shippingUpdate(
  order: { number: string },
  trackingNumber: string,
  courier: string,
  user?: { name?: string | null },
  deliveryNote?: string,
): EmailTemplate {
  const body = [
    p(`Hi ${esc(firstName(user?.name))}, great news — your order has been dispatched and is on its way.`),
    `<div style="border:1px solid ${LINE};border-radius:10px;margin:18px 0;padding:16px;text-align:center;">
      <div style="font-family:${MONO_STACK};font-size:11px;color:${MUTE};letter-spacing:.1em;">TRACKING NUMBER</div>
      <div style="font-family:${FONT_STACK};font-weight:800;font-size:22px;margin-top:4px;color:${INK};">${esc(trackingNumber)}</div>
      <div style="font-family:${MONO_STACK};font-size:11px;color:${STEEL};margin-top:4px;">${esc(courier)}</div>
    </div>`,
    `<p style="text-align:center;margin:8px 0;">${btn("Track Shipment", `${SITE_URL}/orders`)}</p>`,
    deliveryNote
      ? `<p style="font-size:13px;color:${STEEL};text-align:center;margin:0;">${esc(deliveryNote)}</p>`
      : "",
  ].join("");

  return {
    subject: "📦 Your order has shipped!",
    html: shell({
      hero: {
        bg: INK_2,
        icon: "🚚",
        title: "On Its Way",
        sub: `Order #${esc(order.number)}`,
      },
      body,
    }),
  };
}

// ============================================================
// 3) Welcome
// ============================================================
export function welcome(user: { name?: string | null }): EmailTemplate {
  const step = (n: number, t: string, sub: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:13px 16px;border-bottom:1px solid ${LINE};">
        <span style="display:inline-block;vertical-align:middle;width:46px;height:46px;border-radius:8px;background:${BLUE_WASH};color:${BLUE};text-align:center;line-height:46px;font-weight:700;">${n}</span>
        <span style="display:inline-block;vertical-align:middle;margin-left:13px;">
          <b style="font-weight:600;font-size:14px;color:${INK};">${esc(t)}</b>
          <span style="display:block;font-size:12px;color:${STEEL};">${esc(sub)}</span>
        </span>
      </td>
    </tr></table>`;

  const body = [
    p("Thanks for joining VSK Sports — India's trusted shooting sports partner. Here's how to get started:"),
    card(
      step(1, "Find your gear", "Browse rifles, pistols & starter kits") +
        step(2, "Learn from a coach", "Join a beginner camp near you") +
        step(3, "Earn rewards", "Points on every purchase & review"),
    ),
    `<p style="text-align:center;margin:8px 0;">${btn("Start Shopping", `${SITE_URL}/shop`)}</p>`,
    `<p style="text-align:center;font-size:13px;color:${STEEL};margin:0;">Use code <b style="color:${RED};">WELCOME10</b> for 10% off your first order.</p>`,
  ].join("");

  return {
    subject: "Welcome to VSK Sports 🎯",
    html: shell({
      hero: {
        bg: `linear-gradient(150deg,${BLUE_INK},${BLUE})`,
        icon: "◎",
        title: "Welcome to the Line",
        sub: `You're in, ${esc(firstName(user.name))}. Let's get you on target.`,
      },
      body,
      footerLinks: `<a href="${SITE_URL}/profile" style="color:${BLUE};">Manage preferences</a>`,
    }),
  };
}

// ============================================================
// 4) Review request
// ============================================================
export function reviewRequest(
  user: { name?: string | null },
  product: { name: string; slug: string },
): EmailTemplate {
  const ph = esc(product.name.slice(0, 3).toUpperCase());
  const body = [
    p(
      `Hi ${esc(firstName(user.name))}, we hope you're enjoying your new gear! A quick review helps other shooters and earns you <b>50 reward points</b>.`,
    ),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;margin:6px 0 18px;"><tr>
      <td style="padding:13px 16px;">
        <span style="display:inline-block;vertical-align:middle;width:46px;height:46px;border-radius:8px;background:${PAPER_3};text-align:center;line-height:46px;font-family:${MONO_STACK};font-size:9px;color:${MUTE};">${ph}</span>
        <span style="display:inline-block;vertical-align:middle;margin-left:13px;">
          <b style="font-weight:600;font-size:14px;color:${INK};">${esc(product.name)}</b>
          <span style="display:block;color:${AMBER};font-size:16px;letter-spacing:2px;">☆☆☆☆☆</span>
        </span>
      </td>
    </tr></table>`,
    `<p style="text-align:center;margin:8px 0;">${btn("Write a Review", `${SITE_URL}/product/${product.slug}`, RED)}</p>`,
  ].join("");

  return {
    subject: `How's your ${product.name}? ⭐`,
    html: shell({
      hero: {
        bg: GREEN,
        icon: "★",
        title: "How Did We Do?",
        sub: "Your order was delivered — share your thoughts",
      },
      body,
      footerLinks: `<a href="#" style="color:${BLUE};">Unsubscribe</a>`,
    }),
  };
}
