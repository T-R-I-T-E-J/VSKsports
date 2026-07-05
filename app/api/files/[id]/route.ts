import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Auth-gated download for PRIVATE files (dealer/order documents). Enforces
// owner-or-staff access + scan-clean before streaming bytes. Public files
// redirect to their direct /uploads URL. See UPLOAD_PLAN.md §10.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Sign in to view this file." }, { status: 401 });

  const file = await prisma.file.findUnique({
    where: { id },
    include: {
      dealerDocument: { include: { application: { select: { userId: true } } } },
      orderDocument: { include: { order: { select: { userId: true } } } },
    },
  });
  if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const staff = user.role === "ADMIN" || user.role === "STAFF";

  // Public assets are served straight from /uploads.
  if (file.visibility === "PUBLIC" && file.url) {
    return NextResponse.redirect(new URL(file.url, req.url));
  }

  // PRIVATE: must be scanned clean before anyone can pull it.
  if (file.scanStatus && file.scanStatus !== "clean") {
    return NextResponse.json({ error: "File is still being scanned." }, { status: 403 });
  }

  // Owner or staff only. 404 (not 403) so we don't leak that the file exists.
  const ownerId =
    file.dealerDocument?.application?.userId ?? file.orderDocument?.order?.userId ?? file.uploadedById;
  if (!staff && ownerId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Stream from the local private store. (Prod/blob: redirect to a signed URL —
  // not reachable here because PRIVATE + blob is blocked at upload, §17.)
  try {
    const buf = await fs.readFile(path.join(process.cwd(), ".uploads-private", file.key));
    const safeName = (file.key.split("/").pop() ?? "file").replace(/["\\\r\n]/g, "_");
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "content-type": file.mime,
        // SECURITY: doc bytes are attacker-controllable (client-supplied MIME).
        // Force download (never render in-page), block MIME sniffing, and
        // sandbox — so a polyglot/HTML doc can't run script on our origin.
        "content-disposition": `attachment; filename="${safeName}"`,
        "x-content-type-options": "nosniff",
        "content-security-policy": "sandbox; default-src 'none'",
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File unavailable." }, { status: 404 });
  }
}
