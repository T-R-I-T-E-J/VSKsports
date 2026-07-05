import Link from "next/link";
import type { FileKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Crumb, PageHead } from "../_lib/ui";
import { MediaGrid } from "./MediaGrid";

export const metadata = { title: "Media Library — VSK Admin" };

const KINDS: FileKind[] = [
  "PRODUCT_IMAGE", "AVATAR", "BLOG_MEDIA", "EVENT_MEDIA",
  "REVIEW_PHOTO", "RETURN_PHOTO", "DEALER_DOC", "ORDER_DOC", "OTHER",
];
const PER = 24;
const label = (k: string) => k.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const kind = (KINDS as string[]).includes(sp.kind ?? "") ? (sp.kind as FileKind) : undefined;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = {
    ...(kind ? { kind } : {}),
    ...(q
      ? {
          OR: [
            { key: { contains: q, mode: "insensitive" as const } },
            { alt: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Uses the File(kind, createdAt) index from the perf review (UPLOAD_PLAN.md §13).
  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PER,
      skip: (page - 1) * PER,
      include: { productImage: { select: { id: true } } },
    }),
    prisma.file.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER));

  const items = files.map((f) => ({
    id: f.id, url: f.url, kind: f.kind, mime: f.mime, alt: f.alt, sizeBytes: f.sizeBytes, inUse: !!f.productImage,
  }));

  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    if (kind) u.set("kind", kind);
    if (q) u.set("q", q);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/admin/media${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <Crumb items={[["Media Library"]]} />
      <PageHead title="Media Library" sub={`${total} file${total === 1 ? "" : "s"}`} />

      <form method="get" className="mb-5 flex flex-wrap items-center gap-2">
        <select name="kind" defaultValue={kind ?? ""} className="rounded-md border border-line bg-paper px-3 py-2 text-[14px]" aria-label="Filter by type">
          <option value="">All types</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>{label(k)}</option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search filename or alt text"
          aria-label="Search media"
          className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-blue"
        />
        <button className="btn btn--primary btn--sm" type="submit">Filter</button>
        {(kind || q) && <Link href="/admin/media" className="btn btn--ghost btn--sm">Clear</Link>}
      </form>

      <MediaGrid files={items} />

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-[13px]">
          {page > 1 ? <Link href={pageHref(page - 1)} className="btn btn--ghost btn--sm">← Prev</Link> : <span className="opacity-40">← Prev</span>}
          <span className="font-mono text-mute">Page {page} / {totalPages}</span>
          {page < totalPages ? <Link href={pageHref(page + 1)} className="btn btn--ghost btn--sm">Next →</Link> : <span className="opacity-40">Next →</span>}
        </div>
      )}
    </div>
  );
}
