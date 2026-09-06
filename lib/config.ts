/**
 * Runtime configuration checks.
 *
 * The audit found three integrations that were silently unconfigured in
 * production: payments, email and storage. Two of them fail *quietly* —
 * the mailer fell back to a console transport and still recorded EmailStatus
 * SENT, and the storage driver defaulted to a filesystem that does not persist
 * on serverless. Nothing surfaced either.
 *
 * This module is the single place that knows what production requires, so the
 * health endpoint and the fail-closed guards agree on one definition instead of
 * each re-deriving it.
 */

export const isProduction = process.env.NODE_ENV === "production";

export type ConfigCheck = {
  /** Subsystem name, as it appears in the health payload. */
  name: string;
  ok: boolean;
  /** Present only when `ok` is false — safe to log, never contains secrets. */
  detail?: string;
};

const has = (key: string): boolean => Boolean(process.env[key]?.trim());

/** Razorpay needs all three: without the webhook secret every callback is rejected. */
export function paymentsConfigured(): boolean {
  return has("RAZORPAY_KEY_ID") && has("RAZORPAY_KEY_SECRET") && has("RAZORPAY_WEBHOOK_SECRET");
}

/** SMTP_HOST is what `pickTransport()` keys on, so it is the meaningful signal. */
export function emailConfigured(): boolean {
  return has("SMTP_HOST") && (has("SMTP_FROM") || has("SMTP_USER"));
}

/**
 * The `local` driver writes to the filesystem, which is ephemeral on serverless.
 * Production must therefore be explicitly set to a durable driver.
 */
export function storageConfigured(): boolean {
  const driver = process.env.STORAGE_DRIVER?.trim() || "local";
  if (driver === "local") return !isProduction;
  if (driver === "blob") return has("BLOB_READ_WRITE_TOKEN");
  return false;
}

/**
 * Every subsystem whose misconfiguration is invisible at runtime.
 * Ordered by launch impact so the health payload reads top-down.
 */
export function runtimeConfigChecks(): ConfigCheck[] {
  const driver = process.env.STORAGE_DRIVER?.trim() || "local";
  return [
    {
      name: "payments",
      ok: paymentsConfigured(),
      detail: paymentsConfigured()
        ? undefined
        : "RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET must all be set",
    },
    {
      name: "email",
      ok: emailConfigured(),
      detail: emailConfigured() ? undefined : "SMTP_HOST and SMTP_FROM (or SMTP_USER) must be set",
    },
    {
      name: "storage",
      ok: storageConfigured(),
      detail: storageConfigured()
        ? undefined
        : `driver "${driver}" is not durable in this environment`,
    },
    {
      name: "auth",
      ok: has("AUTH_SECRET"),
      detail: has("AUTH_SECRET") ? undefined : "AUTH_SECRET must be set",
    },
  ];
}

/** True when every subsystem required by this environment is configured. */
export function configHealthy(): boolean {
  return runtimeConfigChecks().every((c) => c.ok);
}
