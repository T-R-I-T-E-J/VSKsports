"use client";

import { useState } from "react";
import { submitToWeb3Forms } from "@/lib/web3forms";

export function QuoteForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    setError("");
    const res = await submitToWeb3Forms(fields, "New academy quote request — VSK Sports");
    if (res.ok) {
      setStatus("sent");
      form.reset();
    } else {
      setStatus("error");
      setError(res.error);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 13 }}>
      <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      <div className="field">
        <label>Academy / Club</label>
        <input name="organisation" required placeholder="Organisation name" />
      </div>
      <div className="field">
        <label>Number of lanes</label>
        <select name="lanes">
          <option>1–5 lanes</option>
          <option>6–10 lanes</option>
          <option>11–20 lanes</option>
          <option>20+ lanes</option>
        </select>
      </div>
      <div className="field">
        <label>Phone</label>
        <input name="phone" required placeholder="+91" />
      </div>
      <button
        className="btn btn--primary"
        style={{ width: "100%", justifyContent: "center" }}
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Get My Quote"}
      </button>
      {status === "sent" && (
        <div
          style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: "center", color: "#1FA855", fontFamily: "var(--font-mono)", fontSize: 12 }}
          role="status"
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 13l4 4L19 7" />
          </svg>
          Sent! We&apos;ll prepare your quote.
        </div>
      )}
      {status === "error" && (
        <div role="alert" style={{ textAlign: "center", color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          {error}
        </div>
      )}
    </form>
  );
}
