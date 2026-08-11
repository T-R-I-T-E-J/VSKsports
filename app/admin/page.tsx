// Nonce-based CSP requires per-request rendering: a prerendered page would ship
// HTML baked at build time, whose scripts carry no nonce matching the CSP header
// issued for the request — the browser would block every script on the page.
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default function AdminIndex() {
  redirect("/admin/dashboard");
}
