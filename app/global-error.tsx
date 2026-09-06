"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

/**
 * Last-resort boundary for errors thrown in the root layout itself.
 * Must render its own <html>/<body> and cannot rely on app CSS, so styles
 * are inline (tokens: ink #0B0F17, red #E11D2B, blue #1B43C8).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportClientError(error, "global");
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#0B0F17",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#E11D2B",
              margin: 0,
            }}
          >
            Critical Error
          </p>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              textTransform: "uppercase",
              margin: "12px 0 0",
            }}
          >
            The app hit a snag
          </h1>
          <p style={{ marginTop: 16, color: "rgba(255,255,255,0.7)" }}>
            A critical error occurred. Please reload the page.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 12,
                fontFamily: "monospace",
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              borderRadius: 8,
              background: "#1B43C8",
              color: "#fff",
              border: 0,
              padding: "12px 24px",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
