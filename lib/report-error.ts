/**
 * Ship a client-side crash to /api/client-error.
 *
 * Best effort by design: an error boundary is already the failure path, so this
 * must never throw, never block rendering, and never retry. If the report is
 * lost, the customer still sees the error page — which is the part that matters
 * to them.
 *
 * `keepalive` lets the request outlive the page when the crash is followed by a
 * navigation away, which is exactly when a report is most likely to be lost.
 */
export function reportClientError(
  error: Error & { digest?: string },
  boundary: "page" | "global",
): void {
  try {
    const body = JSON.stringify({
      message: String(error?.message ?? ""),
      stack: String(error?.stack ?? ""),
      digest: error?.digest ?? null,
      path: typeof window === "undefined" ? null : window.location.pathname,
      boundary,
    });
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must not add a second failure on top of the first.
  }
}
