"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function ResetPasswordForm({ email, token }: { email: string; token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");

  const invalidLink = !email || !token;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setStatus("saving");
    const res = await resetPassword(email, token, password);
    if (res.ok) {
      setStatus("done");
      setTimeout(() => router.push("/login?reset=1"), 1400);
    } else {
      setStatus("idle");
      setError(res.error);
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-line bg-paper p-8 shadow-[var(--shadow-2)]">
      <Eyebrow>VSK Sports</Eyebrow>
      <h1 className="mt-3 text-2xl font-extrabold uppercase tracking-tight">Reset password</h1>

      {status === "done" ? (
        <>
          <p className="mt-3 text-[15px] text-steel">
            Your password has been updated. Redirecting you to sign in…
          </p>
          <Link href="/login" className="mt-6 inline-block font-semibold text-blue hover:underline">
            Sign in now
          </Link>
        </>
      ) : invalidLink ? (
        <>
          <p className="mt-3 text-[15px] text-red">
            This reset link is missing information or has expired.
          </p>
          <Link href="/forgot-password" className="mt-6 inline-block font-semibold text-blue hover:underline">
            Request a new reset link
          </Link>
        </>
      ) : (
        <form onSubmit={onSubmit}>
          <p className="mt-1 text-[14px] text-steel">
            Choose a new password for <span className="font-semibold text-ink">{email}</span>.
          </p>

          <label className="mt-6 block font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
            New password
          </label>
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5"
          />
          <p className="mt-1 text-[12px] text-mute">At least 8 characters.</p>

          <label className="mt-4 block font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
            Confirm password
          </label>
          <Input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1.5"
          />

          {error && <p className="mt-3 text-[14px] text-red">{error}</p>}

          <Button type="submit" disabled={status === "saving"} className="mt-6 w-full justify-center">
            {status === "saving" ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </div>
  );
}
