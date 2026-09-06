import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { runtimeConfigChecks } from "@/lib/config";

// Prisma needs the Node runtime, and this must never be cached — a health
// check answering from cache is worse than no health check.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health probe for uptime monitoring.
 *
 * Deliberately checks CONFIGURATION as well as database reachability. All three
 * launch blockers the audit found (payments, email and storage unset in
 * production) were invisible precisely because nothing asserted they were
 * configured — a database-only health check would have reported green
 * throughout.
 *
 * Returns 503 when anything is unhealthy so a monitor can alert on status code
 * alone. The body names which subsystem failed but never echoes a secret.
 */
export async function GET(req: NextRequest) {
  /**
   * SECURITY: the per-subsystem breakdown is only returned to an authorized
   * caller. Told "email: not configured", an attacker learns that password
   * reset is silently broken — useful reconnaissance. An uptime monitor only
   * needs the status code, so the public response carries no detail.
   *
   * Reuses CRON_SECRET rather than inventing a second credential.
   */
  const secret = process.env.CRON_SECRET;
  let detailed = false;
  if (secret) {
    const provided = req.headers.get("authorization") ?? "";
    const expected = `Bearer ${secret}`;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    detailed = a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  const checks: { name: string; ok: boolean; detail?: string }[] = [];

  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: "database", ok: true });
  } catch (err) {
    checks.push({
      name: "database",
      ok: false,
      detail: err instanceof Error ? err.message : "unreachable",
    });
  }

  checks.push(...runtimeConfigChecks());

  const ok = checks.every((c) => c.ok);
  return NextResponse.json(
    {
      ok,
      status: ok ? "healthy" : "degraded",
      // Names and detail only for an authorized caller — see above.
      ...(detailed ? { checks, latencyMs: Date.now() - startedAt } : {}),
    },
    {
      status: ok ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
