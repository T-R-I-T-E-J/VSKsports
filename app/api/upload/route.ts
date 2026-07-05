import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UPLOAD_RULES, sanitizeAndStore, type Kind } from "@/lib/storage";

// sharp + fs need the Node runtime (not edge).
export const runtime = "nodejs";

// Server-proxied upload (local driver). Processing (EXIF-strip + re-encode)
// runs here before bytes are stored, so only sanitized files are ever
// written — the temp-then-publish guarantee, collapsed into one pass.
export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  const kind = String(form.get("kind") ?? "OTHER") as Kind;
  const rule = UPLOAD_RULES[kind];

  if (!rule) return NextResponse.json({ error: "Unknown upload kind." }, { status: 400 });

  // SECURITY: the Blob driver can only store public objects. Reject PRIVATE
  // kinds (dealer/order docs) until the signed/client-upload path is wired,
  // so sensitive PII can never be published to a public URL (UPLOAD_PLAN.md §17).
  if (rule.visibility === "PRIVATE" && (process.env.STORAGE_DRIVER ?? "local") === "blob") {
    return NextResponse.json({ error: "Private document uploads are not enabled yet." }, { status: 501 });
  }

  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const staff = user.role === "ADMIN" || user.role === "STAFF";
  if (rule.staffOnly && !staff) {
    return NextResponse.json({ error: "Staff access required." }, { status: 403 });
  }
  if (file.size > rule.maxBytes) {
    return NextResponse.json({ error: `File too large (max ${Math.floor(rule.maxBytes / 1048576)}MB).` }, { status: 400 });
  }
  if (!rule.mimes.includes(file.type)) {
    return NextResponse.json({ error: `File type not allowed: ${file.type || "unknown"}.` }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer());

  let stored;
  try {
    stored = await sanitizeAndStore({ data, mime: file.type, kind });
  } catch {
    return NextResponse.json({ error: "Couldn't process this file." }, { status: 422 });
  }

  // Doc scanning: dev stub marks clean. Prod enqueues a scan and sets "pending"
  // with download gated until clean (UPLOAD_PLAN.md §10).
  const scanStatus = "clean";

  const created = await prisma.file.create({
    data: {
      key: stored.key,
      url: stored.url,
      mime: stored.contentType,
      sizeBytes: stored.sizeBytes,
      width: stored.width,
      height: stored.height,
      kind,
      visibility: rule.visibility,
      status: "ATTACHED",
      sanitized: true,
      scanStatus,
      uploadedById: user.id,
    },
    select: { id: true, url: true, key: true, alt: true, width: true, height: true, mime: true, kind: true },
  });

  return NextResponse.json({ file: created });
}
