"use client";

import { useState } from "react";

/** Client form wrapper that shows an inline success message on submit (no real
    persistence yet — forms are wired to real submission in a later phase). */
export function SubmitForm({
  children,
  message,
  className,
  style,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [sent, setSent] = useState(false);
  return (
    <form
      className={className}
      style={style}
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      {children}
      {sent && (
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
    </form>
  );
}
