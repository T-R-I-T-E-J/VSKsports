"use client";

import { useState } from "react";
import { IconArrowRight } from "@/components/icons";
import { submitToWeb3Forms } from "@/lib/web3forms";

export function NewsletterForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  if (status === "sent") {
    return (
      <p className="text-[14px] text-white" role="status">
        Subscribed — welcome to Range Notes!
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const fields = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus("sending");
    setError("");
    const res = await submitToWeb3Forms(fields, "New newsletter signup — VSK Sports");
    if (res.ok) setStatus("sent");
    else {
      setStatus("error");
      setError(res.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          disabled={status === "sending"}
          // A temp-mail / form-filler browser extension injects style + data-*
          // attributes into email inputs before hydration; suppress the resulting
          // (harmless) mismatch warning since the cause is outside React.
          suppressHydrationWarning
          placeholder="Your email address"
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-[14px] text-white outline-none placeholder:text-white/40 focus:border-white/40 disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Subscribe"
          disabled={status === "sending"}
          className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-md bg-blue text-white transition-colors hover:bg-blue-2 disabled:opacity-60"
        >
          <IconArrowRight width={18} height={18} />
        </button>
      </div>
      {status === "error" && (
        <p role="alert" className="text-[12px] text-red">
          {error}
        </p>
      )}
    </form>
  );
}
