import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Scheduled cleanup of expired rate-limit windows.
 *
 * `lib/rate-limit.ts` writes one row per (endpoint, account-or-IP) window and
 * only deletes a row early on successful login. Without this job the table
 * grows without bound, since per-IP keys are effectively unlimited in number.
 *
 * Invoked by the Vercel cron declared in vercel.json, which sends
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Fail CLOSED: with no secret configured this endpoint would let anyone
  // trigger unauthenticated database writes.
  if (!secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const authorized = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { count } = await prisma.rateLimit.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return NextResponse.json({ ok: true, deleted: count });
}
