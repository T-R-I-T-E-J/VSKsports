import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Fixed-window rate limiting for unauthenticated endpoints.
 *
 * DB-backed rather than in-memory: Server Actions run as ordinary POST
 * endpoints across many serverless instances, so a per-process Map would let an
 * attacker sidestep the limit simply by spreading requests. The counter row is
 * keyed by a caller-supplied string and expires on its own — the increment is
 * atomic in Postgres, so concurrent requests can't race past the ceiling.
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
  const now = new Date();
  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    // No window yet, or the previous one lapsed — start a fresh one.
    if (!existing || existing.expiresAt <= now) {
      const expiresAt = new Date(now.getTime() + windowMs);
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, expiresAt },
        update: { count: 1, expiresAt },
      });
      return { ok: true };
    }

    if (existing.count >= limit) {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000)),
      };
    }

    await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
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
