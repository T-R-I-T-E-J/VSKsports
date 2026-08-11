import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

// ============================================================
// Storage adapter — swap providers via STORAGE_DRIVER (local | blob).
// Local driver writes to public/uploads (dev). Blob driver uses Vercel
// Blob (prod). Images are EXIF-stripped + re-encoded before they land,
// so only sanitized bytes are ever written (temp-then-publish, collapsed
// into one server pass for the proxied path). See UPLOAD_PLAN.md §8/§17.
// ============================================================

export type Kind =
  | "PRODUCT_IMAGE" | "AVATAR" | "BLOG_MEDIA" | "EVENT_MEDIA"
  | "REVIEW_PHOTO" | "RETURN_PHOTO" | "DEALER_DOC" | "ORDER_DOC" | "OTHER";

const MB = 1024 * 1024;
const IMG = ["image/jpeg", "image/png", "image/webp"];

export const UPLOAD_RULES: Record<
  Kind,
  { maxBytes: number; mimes: string[]; visibility: "PUBLIC" | "PRIVATE"; image: boolean; staffOnly: boolean }
> = {
  PRODUCT_IMAGE: { maxBytes: 8 * MB, mimes: IMG, visibility: "PUBLIC", image: true, staffOnly: true },
  AVATAR: { maxBytes: 4 * MB, mimes: IMG, visibility: "PUBLIC", image: true, staffOnly: false },
  BLOG_MEDIA: { maxBytes: 8 * MB, mimes: IMG, visibility: "PUBLIC", image: true, staffOnly: true },
  EVENT_MEDIA: { maxBytes: 8 * MB, mimes: IMG, visibility: "PUBLIC", image: true, staffOnly: true },
  REVIEW_PHOTO: { maxBytes: 8 * MB, mimes: IMG, visibility: "PUBLIC", image: true, staffOnly: false },
  RETURN_PHOTO: { maxBytes: 8 * MB, mimes: IMG, visibility: "PUBLIC", image: true, staffOnly: false },
  DEALER_DOC: { maxBytes: 15 * MB, mimes: ["application/pdf", "image/jpeg", "image/png"], visibility: "PRIVATE", image: false, staffOnly: false },
  ORDER_DOC: { maxBytes: 15 * MB, mimes: ["application/pdf", "image/jpeg", "image/png"], visibility: "PRIVATE", image: false, staffOnly: true },
  OTHER: { maxBytes: 8 * MB, mimes: [...IMG, "application/pdf"], visibility: "PRIVATE", image: false, staffOnly: true },
};

const DRIVER = process.env.STORAGE_DRIVER || "local";
const PUBLIC_DIR = path.join(process.cwd(), "public", "uploads");
const PRIVATE_DIR = path.join(process.cwd(), ".uploads-private");

export interface StoreResult {
  key: string;
  url: string | null; // null for PRIVATE (served via signed route)
  sizeBytes: number;
  contentType: string;
  width?: number;
  height?: number;
}

// EXIF-strip + auto-orient + re-encode. sharp drops metadata on output by
// default, so GPS/EXIF is removed and any embedded payload is neutralized.
async function processImage(input: Buffer) {
  const buffer = await sharp(input).rotate().webp({ quality: 82 }).toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, contentType: "image/webp", ext: "webp", width: meta.width, height: meta.height };
}

export async function sanitizeAndStore(opts: { data: Buffer; mime: string; kind: Kind }): Promise<StoreResult> {
  const rule = UPLOAD_RULES[opts.kind];
  let buffer = opts.data;
  let contentType = opts.mime;
  let ext = mimeExt(opts.mime);
  let width: number | undefined;
  let height: number | undefined;

  if (rule.image) {
    const p = await processImage(opts.data);
    buffer = p.buffer;
    contentType = p.contentType;
    ext = p.ext;
    width = p.width;
    height = p.height;
  }

  const key = `${opts.kind.toLowerCase()}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
  const url = await put(key, buffer, { contentType, visibility: rule.visibility });
  return { key, url, sizeBytes: buffer.length, contentType, width, height };
}

async function put(key: string, data: Buffer, o: { contentType: string; visibility: "PUBLIC" | "PRIVATE" }): Promise<string | null> {
  if (DRIVER === "blob") {
    // SECURITY: Vercel Blob put() only supports public access, which would
    // expose the URL. PRIVATE content (dealer/order docs) must go through the
    // signed/client-upload handshake with a private store (UPLOAD_PLAN.md §17),
    // which isn't wired yet. Refuse loudly rather than silently publishing PII.
    if (o.visibility === "PRIVATE") {
      throw new Error(
        "PRIVATE uploads are not supported by the Blob driver yet — wire the signed/client-upload handshake before enabling private kinds in production.",
      );
    }
    // Prod. NOTE: files >4.5MB should also move to the client-upload handshake.
    const { put: blobPut } = await import("@vercel/blob");
    const res = await blobPut(key, data, { access: "public", contentType: o.contentType, addRandomSuffix: false });
    return res.url;
  }
  // local driver
  const base = o.visibility === "PUBLIC" ? PUBLIC_DIR : PRIVATE_DIR;
  const dest = path.join(base, key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, data);
  return o.visibility === "PUBLIC" ? `/uploads/${key}` : null;
}

export async function deleteObject(key: string, visibility: "PUBLIC" | "PRIVATE" = "PUBLIC"): Promise<void> {
  if (DRIVER === "blob") {
    const { del } = await import("@vercel/blob");
    try {
      await del(key);
    } catch {
      /* already gone */
    }
    return;
  }
  const base = visibility === "PUBLIC" ? PUBLIC_DIR : PRIVATE_DIR;
  try {
    await fs.unlink(path.join(base, key));
  } catch {
    /* already gone */
  }
}

function mimeExt(mime: string): string {
  return (
    { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as Record<string, string>
  )[mime] ?? "bin";
}
