import { NextResponse, type NextRequest } from "next/server";
import { alertOps } from "@/lib/alerts";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receives crashes from the client-side error boundaries.
 *
 * Server errors already reach the platform log. A crash inside a client
 * component reached nobody at all — the customer saw "Something misfired" and
 * the team never found out. This routes those into the same `[ALERT]` stream
 * the runbook tells you to drain, without committing to a monitoring vendor.
 *
 * It is deliberately austere, because it is an unauthenticated write endpoint:
 *
 *  - rate limited per IP, so it cannot be used to flood the log drain;
 *  - the body is size-capped and every field is truncated;
 *  - nothing is stored, only logged — there is no table to fill;
 *  - it always answers 204, so a failure here never turns one error into two
 *    on a page that is already broken.
 */

const MAX_BODY_BYTES = 8_000;
const MAX_FIELD = 1_000;

/**
 * Truncate, and drop control characters.
 *
 * The report is attacker-supplied and goes straight into a log line. A newline
 * inside it would let someone forge additional entries in the drain, so
 * anything below U+0020 (plus DEL) is removed. Done by codepoint rather than a
 * regex so the source file itself contains no control characters — the earlier
 * regex version embedded literal NUL and DEL bytes, which no editor, diff or
 * review survives intact.
 */
function clean(value: unknown, limit = MAX_FIELD): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  let out = "";
  for (const ch of value.slice(0, limit)) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? " " : ch;
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const ip = await clientIp();
    const limited = await rateLimit(`client-error:${ip}`, 20, 10 * 60 * 1000);
    if (!limited.ok) return new NextResponse(null, { status: 204 });

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 });

    const body: unknown = JSON.parse(raw);
    if (typeof body !== "object" || body === null) {
      return new NextResponse(null, { status: 204 });
    }
    const b = body as Record<string, unknown>;

    alertOps("client.render_failed", {
      message: clean(b.message) ?? "(no message)",
      digest: clean(b.digest, 64),
      // The stack is the useful part, but it is also the longest.
      stack: clean(b.stack, 4_000),
      path: clean(b.path, 512),
      boundary: clean(b.boundary, 32),
      userAgent: clean(req.headers.get("user-agent") ?? undefined, 256),
    });
  } catch {
    // Swallow everything. This endpoint exists to report failures, not create them.
  }
  return new NextResponse(null, { status: 204 });
}
