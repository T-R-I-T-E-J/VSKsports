"use client";

import { useState } from "react";
import { submitToWeb3Forms } from "@/lib/web3forms";

/** Client form wrapper that submits its fields to Web3Forms (email delivery) and
    shows an inline sending / success / error state. Child inputs MUST have `name`
    attributes to be collected. `subject` labels the delivered email. */
export function SubmitForm({
  children,
  message,
  subject = "VSK Sports — Website enquiry",
  className,
  style,
}: {
  children: React.ReactNode;
  message: string;
  subject?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    setError("");
    const res = await submitToWeb3Forms(fields, subject);
    if (res.ok) {
      setStatus("sent");
      form.reset();
    } else {
      setStatus("error");
      setError(res.error);
    }
  }

  return (
    <form className={className} style={style} onSubmit={onSubmit}>
      {/* Honeypot — hidden from users, filled only by bots. */}
      <input
        type="checkbox"
        name="botcheck"
        tabIndex={-1}
        autoComplete="off"
        style={{ position: "absolute", left: "-9999px" }}
        aria-hidden="true"
      />
      <fieldset
        disabled={status === "sending"}
        style={{ border: 0, margin: 0, padding: 0, display: "contents" }}
      >
        {children}
      </fieldset>
      {status === "sent" && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "center",
            color: "#1FA855",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
          }}
        >
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 13l4 4L19 7" />
          </svg>
          {message}
        </div>
      )}
      {status === "error" && (
        <div
          role="alert"
          style={{
            textAlign: "center",
            color: "var(--red)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
    </form>
  );
}
