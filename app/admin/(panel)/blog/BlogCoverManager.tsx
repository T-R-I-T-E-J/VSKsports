"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/ui/FileUpload";
import type { UploadedFile } from "@/lib/storage-client";
import { setBlogCover, removeBlogCover } from "./cover-actions";

// Admin blog cover image: shows the current cover (if any) with a Remove
// button, and a single-image uploader. Uploads create a BLOG_MEDIA File, then
// setBlogCover stores its url on the post. Mutates via server actions, refreshes.
export function BlogCoverManager({
  postId,
  coverImage,
}: {
  postId: string;
  coverImage: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onUploaded(f: UploadedFile) {
    startTransition(async () => {
      try {
        await setBlogCover(postId, f.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't set cover image.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      await removeBlogCover(postId);
      router.refresh();
    });
  }

  return (
    <section className="mt-8 rounded-lg border border-line bg-paper p-5">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">Cover image</h2>
      <p className="mt-1 text-[13px] text-steel">Shown at the top of the post and in listings. One image.</p>

      {coverImage ? (
        <div className="mt-4 flex items-start gap-4">
          <div className="relative overflow-hidden rounded-md border border-line bg-paper-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt="" className="h-32 w-56 object-cover" />
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="btn btn--ghost btn--sm"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-line bg-paper-2 px-4 py-6 text-center text-[14px] text-mute">
          No cover image yet — upload one below.
        </p>
      )}

      <div className="mt-4">
        <FileUpload
          kind="BLOG_MEDIA"
          accept="image/jpeg,image/png,image/webp"
          label="Upload cover image"
          hint="JPG, PNG or WebP · up to 8MB"
          onUploaded={onUploaded}
          onError={setError}
        />
      </div>
      {error && <p className="mt-2 text-[13px] text-red" role="alert">{error}</p>}
    </section>
  );
}
