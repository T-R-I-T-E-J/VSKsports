import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Edge instance — reads the JWT only (no Prisma/bcrypt).
const { auth } = NextAuth(authConfig);

const isDev = process.env.NODE_ENV === "development";

/**
 * Route prefixes that require a session. This list used to live in the
 * `matcher` below, but the matcher now spans the whole site so every HTML
 * response gets a CSP nonce. Gating therefore has to be re-checked here —
 * without it the "customer-gated" fallback would redirect public pages to
 * /login.
 */
const PROTECTED_PREFIXES = [
  "/admin",
  "/dealer",
  "/checkout",
  "/order-confirmation",
  "/account",
  "/orders",
  "/returns",
  "/wishlist",
  "/rewards",
  "/notifications",
  "/profile",
];

const isProtected = (pathname: string) =>
  PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Per-request CSP. `'strict-dynamic'` means the nonce is what grants trust:
 * host allowlists in script-src are ignored, and any script loaded *by* a
 * trusted script inherits that trust — which is how Razorpay Checkout
 * (injected at runtime by our own bundled code) keeps working without being
 * named here.
 *
 * style-src deliberately keeps 'unsafe-inline': React renders inline `style`
 * attributes, which CSP governs via style-src-attr falling back to style-src,
 * so a nonce there would strip inline styling across the UI. Inline styles are
 * a far weaker XSS vector than scripts.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://*.razorpay.com https://api.web3forms.com${isDev ? " ws: wss:" : ""}`,
    "frame-src 'self' https://checkout.razorpay.com https://*.razorpay.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const loggedIn = !!req.auth;
  const isStaff = role === "ADMIN" || role === "STAFF";

  // --- auth gating (unchanged behaviour, now prefix-scoped) ---
  const publicAuthPage = pathname === "/login" || pathname === "/admin/login";

  if (!publicAuthPage) {
    if (pathname.startsWith("/admin")) {
      if (!isStaff) return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
    } else if (pathname.startsWith("/dealer")) {
      if (!loggedIn) return NextResponse.redirect(new URL("/login", req.nextUrl));
      if (role !== "DEALER" && !isStaff) return NextResponse.redirect(new URL("/", req.nextUrl));
    } else if (isProtected(pathname) && !loggedIn) {
      const url = new URL("/login", req.nextUrl);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  // --- CSP nonce ---
  // Next reads the nonce out of the request's CSP header and stamps it onto the
  // framework/page scripts it emits, so no tag needs it added by hand.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
});

export const config = {
  matcher: [
    // Everything except API routes (which serve JSON and set their own headers,
    // e.g. the sandboxed file-download route) and static assets. Prefetches are
    // skipped — they render no HTML, so they need no nonce.
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
