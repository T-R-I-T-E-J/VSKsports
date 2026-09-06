import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * These guard the three launch blockers the audit found, all of which were
 * invisible in production: payments, email and storage silently unconfigured.
 * `lib/config` is the single definition of "configured", so the health endpoint
 * and the fail-closed guards cannot drift apart.
 */

const KEYS = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "SMTP_HOST",
  "SMTP_FROM",
  "SMTP_USER",
  "STORAGE_DRIVER",
  "BLOB_READ_WRITE_TOKEN",
  "AUTH_SECRET",
  "NODE_ENV",
] as const;

let saved: Record<string, string | undefined> = {};

/** process.env.NODE_ENV is typed readonly; tests legitimately need to vary it. */
const env = process.env as Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

/** Re-import so module-level `isProduction` reflects the env under test. */
async function loadConfig() {
  vi.resetModules();
  return import("@/lib/config");
}

describe("paymentsConfigured", () => {
  it("requires all three Razorpay values", async () => {
    const c = await loadConfig();
    expect(c.paymentsConfigured()).toBe(false);

    process.env.RAZORPAY_KEY_ID = "rzp_test_x";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    // Without the webhook secret every callback is rejected, so this is not
    // "configured" even though checkout itself would open a gateway order.
    expect((await loadConfig()).paymentsConfigured()).toBe(false);

    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec";
    expect((await loadConfig()).paymentsConfigured()).toBe(true);
  });

  it("treats whitespace as unset", async () => {
    process.env.RAZORPAY_KEY_ID = "   ";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec";
    expect((await loadConfig()).paymentsConfigured()).toBe(false);
  });
});

describe("emailConfigured", () => {
  it("needs a host and a sender", async () => {
    expect((await loadConfig()).emailConfigured()).toBe(false);

    process.env.SMTP_HOST = "smtp.example.com";
    expect((await loadConfig()).emailConfigured()).toBe(false);

    process.env.SMTP_FROM = "orders@example.com";
    expect((await loadConfig()).emailConfigured()).toBe(true);
  });
});

describe("storageConfigured", () => {
  it("accepts the local driver only outside production", async () => {
    env.NODE_ENV = "development";
    expect((await loadConfig()).storageConfigured()).toBe(true);

    // On serverless the local filesystem is ephemeral, so uploads would be lost.
    env.NODE_ENV = "production";
    expect((await loadConfig()).storageConfigured()).toBe(false);
  });

  it("requires a token for the blob driver", async () => {
    env.NODE_ENV = "production";
    process.env.STORAGE_DRIVER = "blob";
    expect((await loadConfig()).storageConfigured()).toBe(false);

    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_x";
    expect((await loadConfig()).storageConfigured()).toBe(true);
  });

  it("rejects an unknown driver rather than falling back", async () => {
    process.env.STORAGE_DRIVER = "s3";
    expect((await loadConfig()).storageConfigured()).toBe(false);
  });
});

describe("runtimeConfigChecks", () => {
  it("names every failing subsystem without leaking a secret value", async () => {
    env.NODE_ENV = "production";
    process.env.RAZORPAY_KEY_ID = "rzp_live_supersecret";
    const c = await loadConfig();
    const checks = c.runtimeConfigChecks();

    expect(checks.map((x: { name: string }) => x.name)).toEqual([
      "payments",
      "email",
      "storage",
      "auth",
    ]);
    expect(c.configHealthy()).toBe(false);

    // Detail strings are surfaced by the health endpoint, so they must never
    // echo a configured value back to a caller.
    const details = checks.map((x: { detail?: string }) => x.detail ?? "").join(" ");
    expect(details).not.toContain("supersecret");
  });

  it("is healthy when everything is set", async () => {
    env.NODE_ENV = "production";
    process.env.RAZORPAY_KEY_ID = "id";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_FROM = "orders@example.com";
    process.env.STORAGE_DRIVER = "blob";
    process.env.BLOB_READ_WRITE_TOKEN = "token";
    process.env.AUTH_SECRET = "authsecret";

    expect((await loadConfig()).configHealthy()).toBe(true);
  });
});
