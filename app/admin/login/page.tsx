// Nonce-based CSP requires per-request rendering: a prerendered page would ship
// HTML baked at build time, whose scripts carry no nonce matching the CSP header
// issued for the request — the browser would block every script on the page.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-2 px-4 py-12">
      <LoginForm
        heading="Admin sign in"
        sub="Staff access to the VSK control panel."
        callbackUrl="/admin/dashboard"
      />
    </div>
  );
}
