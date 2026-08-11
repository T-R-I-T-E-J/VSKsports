import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Static security headers. Content-Security-Policy is NOT here — it carries a
 * per-request nonce and so is issued from `proxy.ts`, which is the only place
 * that can generate one per response.
 */
const securityHeaders = [
  // Legacy companion to the CSP's frame-ancestors, for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // HSTS only in production — it would pin localhost to https otherwise.
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  // Pin the workspace root so Next ignores the stray parent lockfile in the home dir.
  turbopack: {
    root: import.meta.dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
