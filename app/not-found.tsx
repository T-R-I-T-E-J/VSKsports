// Nonce-based CSP requires per-request rendering: a prerendered page would ship
// HTML baked at build time, whose scripts carry no nonce matching the CSP header
// issued for the request — the browser would block every script on the page.
export const dynamic = "force-dynamic";

import Link from "next/link";

export const metadata = { title: "Page Not Found" };

export default function NotFound() {
  return (
    <div className="relative grid min-h-[80vh] place-items-center overflow-hidden bg-ink px-6 py-20 text-white">
      {/* dot-grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* concentric target rings */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        {[680, 520, 360, 200].map((s) => (
          <div
            key={s}
            className="absolute rounded-full border border-white/10"
            style={{ width: s, height: s, left: -s / 2, top: -s / 2 }}
          />
        ))}
      </div>

      <div className="relative text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-red">
          Error 404
        </p>
        <div className="mt-4 font-mono text-[88px] leading-none font-bold tracking-tight text-white/90 sm:text-[120px]">
          404
        </div>
        <h1 className="mt-2 text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
          Off Target
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[17px] text-white/70">
          This page missed the mark — it may have moved or never existed.
          Let&apos;s get you back on the line.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-blue px-6 py-3 font-medium text-white transition hover:-translate-y-0.5 hover:bg-blue-2"
          >
            Back to Home
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center rounded-md border border-white/25 px-6 py-3 font-medium text-white transition hover:bg-white/10"
          >
            Browse Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
