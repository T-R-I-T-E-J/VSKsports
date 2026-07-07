"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    await requestPasswordReset(email);
    setStatus("sent");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-lg border border-line bg-paper p-8 shadow-[var(--shadow-2)]"
    >
      <Eyebrow>VSK Sports</Eyebrow>
      <h1 className="mt-3 text-2xl font-extrabold uppercase tracking-tight">
        Forgot password
      </h1>

      {status === "sent" ? (
        <>
          <p className="mt-3 text-[15px] text-steel">
            If an account exists for <span className="font-semibold text-ink">{email}</span>, we&apos;ve
            sent a link to reset your password. Check your inbox (and spam) — the link expires in 1 hour.
          </p>
          <Link href="/login" className="mt-6 inline-block font-semibold text-blue hover:underline">
            ← Back to sign in
          </Link>
        </>
      ) : (
        <>
          <p className="mt-1 text-[14px] text-steel">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          <label className="mt-6 block font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
            Email
          </label>
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
          />

          <Button type="submit" disabled={status === "sending"} className="mt-6 w-full justify-center">
            {status === "sending" ? "Sending…" : "Send reset link"}
          </Button>

          <p className="mt-4 text-[14px] text-steel">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-blue hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </form>
  );
}
