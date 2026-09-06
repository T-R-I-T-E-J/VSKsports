import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Fixed-window rate limiting for unauthenticated endpoints.
 *
 * DB-backed rather than in-memory: Server Actions run as ordinary POST
 * endpoints across many serverless instances, so a per-process Map would let an
 * attacker sidestep the limit simply by spreading requests.
 *
 * CONCURRENCY: the whole consume operation is ONE statement. An earlier version
 * read the row, compared the count to the limit, then incremented in a separate
 * update — three statements with no lock, so parallel requests all read the same
 * pre-increment value and all passed the check. That defeated the ceiling by
 * roughly the concurrency factor on the only brute-force protection guarding
 * sign-in. The upsert below increments and returns the new count in a single
 * atomic statement, and the limit is compared AFTER incrementing, so exactly
 * `limit` callers can succeed per window no matter how they are interleaved.
 */

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Best-effort caller IP from the proxy headers. Returns "unknown" when there is
 * no request scope (or no forwarding header), which buckets such callers
 * together — deliberately conservative, since the alternative is no limit.
 */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    // Prefer the platform-set header: Vercel writes x-vercel-forwarded-for
    // itself, so unlike x-forwarded-for a client cannot forge it to rotate
    // through fresh rate-limit buckets.
    const platform = h.get("x-vercel-forwarded-for");
    if (platform) return platform.split(",")[0]!.trim();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    return h.get("x-real-ip") ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Consume one unit against `key`. Returns `ok: false` once `limit` is reached
 * within `windowMs`, with the seconds remaining until the window resets.
 *
 * Fails OPEN: if the rate-limit table itself errors we allow the request rather
 * than lock every user out of signing in over an infrastructure blip.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowSecs = windowMs / 1000;
  try {
    // Insert-or-increment in one statement. The CASE arms restart the window
    // when the stored one has lapsed, so an expired row is reused rather than
    // needing a separate delete. RETURNING gives us the post-increment count,
    // which is the value the limit must be compared against.
    //
    // CLOCKS: every timestamp here comes from the database (`NOW()`), never from
    // the caller. Server Actions run across many serverless instances whose
    // clocks drift independently, so a window written against one instance's
    // clock and compared against another's expires early or late. Keeping the
    // read and the write on a single clock removes that class of bug entirely.
    const rows = await prisma.$queryRaw<{ count: number; retryAfterSec: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "expiresAt")
      VALUES (${key}, 1, NOW() + make_interval(secs => ${windowSecs}))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."expiresAt" <= NOW() THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "expiresAt" = CASE
          WHEN "RateLimit"."expiresAt" <= NOW() THEN NOW() + make_interval(secs => ${windowSecs})
          ELSE "RateLimit"."expiresAt"
        END
      RETURNING
        "count",
        GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("expiresAt" - NOW()))))::int AS "retryAfterSec"
    `;

    const row = rows[0];
    // No row returned should be impossible for an upsert, but treat it the same
    // as the catch below rather than throwing into a sign-in attempt.
    if (!row) return { ok: true };

    if (row.count > limit) {
      return { ok: false, retryAfterSec: row.retryAfterSec };
    }

    return { ok: true };
  } catch (err) {
    console.error("[rate-limit] check failed, allowing request:", err);
    return { ok: true };
  }
}

/** Clear a window early — used to forgive the login counter on success. */
export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } }).catch(() => {});
}

/** Human-readable wait, for messages shown to the user. */
export function retryAfterLabel(sec: number): string {
  if (sec < 60) return `${sec} second${sec === 1 ? "" : "s"}`;
  const mins = Math.ceil(sec / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}
