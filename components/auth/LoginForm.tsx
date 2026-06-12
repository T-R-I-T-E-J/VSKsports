"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
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
    router.push(callbackUrl);
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

      <p className="mt-4 font-mono text-[11px] text-mute">
        Dev seed login — admin@vsksports.in / vsksports
      </p>
    </form>
  );
}
