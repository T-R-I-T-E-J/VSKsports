"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { safeCallbackUrl } from "@/lib/nav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function LoginForm({
  heading = "Sign in",
  sub,
  callbackUrl = "/",
}: {
  heading?: string;
  sub?: string;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(safeCallbackUrl(callbackUrl));
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-lg border border-line bg-paper p-8 shadow-[var(--shadow-2)]"
    >
      <Eyebrow>VSK Sports</Eyebrow>
      <h1 className="mt-3 text-2xl font-extrabold uppercase tracking-tight">
        {heading}
      </h1>
      {sub && <p className="mt-1 text-[14px] text-steel">{sub}</p>}

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

      <label className="mt-4 block font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
        Password
      </label>
      <Input
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1.5"
      />

      {error && <p className="mt-3 text-[14px] text-red">{error}</p>}

      <Button type="submit" disabled={loading} className="mt-6 w-full justify-center">
        {loading ? "Signing in…" : "Sign in"}
      </Button>

      <p className="mt-4 text-[14px] text-steel">
        New to VSK Sports?{" "}
        <Link
          href={
            callbackUrl && callbackUrl !== "/"
              ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
              : "/register"
          }
          className="font-semibold text-blue hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
