"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { registerUser } from "@/app/actions/register";
import { safeCallbackUrl } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function RegisterForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    const res = await registerUser({ name, email, phone, password });
    if (!res.ok) {
      setLoading(false);
      setError(res.error);
      return;
    }

    // Auto sign-in with the credentials we just created.
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    const target = safeCallbackUrl(callbackUrl);
    if (signInRes?.error) {
      // Account exists but sign-in failed — send them to the login page.
      router.push(`/login?callbackUrl=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-lg border border-line bg-paper p-8 shadow-[var(--shadow-2)]"
    >
      <Eyebrow>VSK Sports</Eyebrow>
      <h1 className="mt-3 text-2xl font-extrabold uppercase tracking-tight">
        Create account
      </h1>
      <p className="mt-1 text-[14px] text-steel">
        Join to track orders, save a wishlist and earn rewards.
      </p>

      <label className="mt-6 block font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
        Full name
      </label>
      <Input
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1.5"
      />

      <label className="mt-4 block font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
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

      <label className="mt-4 block font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
        Phone <span className="text-mute/70">(optional)</span>
      </label>
      <Input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="mt-1.5"
      />

      <label className="mt-4 block font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
        Password
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

      <Button type="submit" disabled={loading} className="mt-6 w-full justify-center">
        {loading ? "Creating account…" : "Create account"}
      </Button>

      <p className="mt-4 text-[14px] text-steel">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-blue hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
