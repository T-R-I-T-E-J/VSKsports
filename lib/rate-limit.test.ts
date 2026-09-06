import { describe, it, expect, afterAll } from "vitest";
import { rateLimit, resetRateLimit, retryAfterLabel } from "@/lib/rate-limit";
import { prisma, TEST_TAG, cleanup } from "@/test/fixtures";

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const key = (name: string) => `${TEST_TAG}-${name}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * This is the regression guard for the audit's F-1.
 *
 * The previous implementation read the counter, compared it to the limit, then
 * incremented in a separate statement — with no lock, so parallel callers all
 * observed the same pre-increment value and all passed. It sat under a comment
 * asserting the operation was atomic, which is exactly why nobody re-examined
 * it. The first test below fails against that implementation and passes against
 * the single-statement upsert that replaced it.
 */
describe("rateLimit", () => {
  it("allows exactly `limit` callers when they arrive concurrently", async () => {
    const k = key("concurrent");
    const limit = 8;

    // 40 simultaneous attempts against a ceiling of 8. Serial callers were
    // always handled correctly; concurrency was the hole.
    const results = await Promise.all(
      Array.from({ length: 40 }, () => rateLimit(k, limit, 60_000)),
    );

    const allowed = results.filter((r) => r.ok).length;
    expect(allowed).toBe(limit);
    expect(results.filter((r) => !r.ok)).toHaveLength(32);
  });

  it("allows exactly `limit` callers when they arrive serially", async () => {
    const k = key("serial");
    const limit = 3;

    const outcomes: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      outcomes.push((await rateLimit(k, limit, 60_000)).ok);
    }

    expect(outcomes).toEqual([true, true, true, false, false, false]);
  });

  it("reports a retry delay within the window", async () => {
    const k = key("retry");
    await rateLimit(k, 1, 60_000);
    const blocked = await rateLimit(k, 1, 60_000);

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
      expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
    }
  });

  it("starts a fresh window once the previous one has lapsed", async () => {
    const k = key("expiry");
    // A 1ms window is already expired by the time the second call runs.
    expect((await rateLimit(k, 1, 1)).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 30));
    expect((await rateLimit(k, 1, 1)).ok).toBe(true);
  });

  it("forgives the counter on reset, so a successful sign-in unblocks", async () => {
    const k = key("reset");
    await rateLimit(k, 1, 60_000);
    expect((await rateLimit(k, 1, 60_000)).ok).toBe(false);

    await resetRateLimit(k);

    expect((await rateLimit(k, 1, 60_000)).ok).toBe(true);
  });

  it("keys are independent — one caller cannot exhaust another's budget", async () => {
    const a = key("iso-a");
    const b = key("iso-b");
    await Promise.all(Array.from({ length: 5 }, () => rateLimit(a, 2, 60_000)));

    expect((await rateLimit(b, 2, 60_000)).ok).toBe(true);
  });
});

describe("retryAfterLabel", () => {
  it("reads naturally in both units", () => {
    expect(retryAfterLabel(1)).toBe("1 second");
    expect(retryAfterLabel(45)).toBe("45 seconds");
    expect(retryAfterLabel(60)).toBe("1 minute");
    expect(retryAfterLabel(150)).toBe("3 minutes");
  });
});
