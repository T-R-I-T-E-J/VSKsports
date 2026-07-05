"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/ui/FileUpload";
import { deleteMediaFile } from "./media-actions";

export interface MediaFile {
  id: string;
  url: string | null;
  kind: string;
  mime: string;
  alt: string | null;
  sizeBytes: number;
  inUse: boolean;
}

// Client grid for the media library: upload (adds to library), browse, and
// delete (blocked when in use). Filtering/pagination are server-rendered in
// the page. See UPLOAD_PLAN.md §19.
export function MediaGrid({ files }: { files: MediaFile[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onUploaded() {
    start(() => router.refresh());
  }

  function del(id: string) {
    setMsg(null);
    start(async () => {
      const res = await deleteMediaFile(id);
      if (!res.ok) setMsg(res.error ?? "Couldn't delete the file.");
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-5 rounded-lg border border-line bg-paper p-4">
        <FileUpload
          kind="BLOG_MEDIA"
          multiple
          accept="image/jpeg,image/png,image/webp"
          label="Drag images here to add to the library"
          hint="JPG, PNG or WebP · up to 8MB each"
          onUploaded={onUploaded}
          onError={setMsg}
        />
      </div>

      {msg && <p className="mb-3 text-[13px] text-red" role="alert">{msg}</p>}

      {files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-paper-2 px-6 py-14 text-center">
          <p className="text-[15px] font-medium text-ink">No media yet</p>
          <p className="mt-1 text-[13px] text-mute">Upload your first file above, or add images from a product, blog post, or event.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {files.map((f) => (
            <li key={f.id} className="overflow-hidden rounded-md border border-line bg-paper">
              <div className="relative aspect-square bg-paper-3">
                {f.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={f.alt ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center font-mono text-[11px] text-mute">
                    {f.mime.split("/").pop()?.toUpperCase()}
                  </div>
                )}
                <span className="absolute left-1 top-1 rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-white">
                  {f.kind.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="font-mono text-[10px] text-mute">{Math.max(1, Math.round(f.sizeBytes / 1024))}KB</span>
                {f.inUse ? (
                  <span className="font-mono text-[9px] uppercase tracking-wide text-steel" title="Attached to a product">in use</span>
                ) : (
                  <button
                    type="button"
                    aria-label="Delete file"
                    disabled={pending}
                    onClick={() => del(f.id)}
                    className="rounded px-1.5 py-0.5 text-[11px] text-red hover:bg-red-wash disabled:opacity-40"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
