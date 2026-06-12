"use client";

import { useState } from "react";

export function QuoteForm() {
  const [sent, setSent] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      style={{ display: "grid", gap: 13 }}
    >
      <div className="field">
        <label>Academy / Club</label>
        <input required placeholder="Organisation name" />
      </div>
      <div className="field">
        <label>Number of lanes</label>
        <select>
          <option>1–5 lanes</option>
          <option>6–10 lanes</option>
          <option>11–20 lanes</option>
          <option>20+ lanes</option>
        </select>
      </div>
      <div className="field">
        <label>Phone</label>
        <input required placeholder="+91" />
      </div>
      <button className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }}>
        Get My Quote
      </button>
      {sent && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            justifyContent: "center",
            color: "#1FA855",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
          role="status"
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 13l4 4L19 7" />
          </svg>
          Sent! We&apos;ll prepare your quote.
        </div>
      )}
    </form>
  );
}
