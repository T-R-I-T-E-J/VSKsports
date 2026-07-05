"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/ui/FileUpload";
import type { UploadedFile } from "@/lib/storage-client";
import { setMediaImage, removeMediaImage } from "./event-image-actions";

// Single cover image for an event or training batch. Shows the current image
// with a Remove control, plus an uploader. On upload it persists the file via
// setMediaImage, then refreshes. DRY across both record kinds.
export function EventMediaManager({
  kind,
  id,
  imageUrl,
}: {
  kind: "event" | "training";
  id: string;
  imageUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onUploaded(f: UploadedFile) {
    startTransition(async () => {
      try {
        await setMediaImage(kind, id, f.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't set image.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await removeMediaImage(kind, id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't remove image.");
      }
    });
  }

  return (
    <section className="mt-8 rounded-lg border border-line bg-paper p-5">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">Cover image</h2>
      <p className="mt-1 text-[13px] text-steel">A single image shown publicly for this {kind}.</p>

      {imageUrl ? (
        <div className="mt-4 flex items-start gap-4">
          <div className="relative h-32 w-48 overflow-hidden rounded-md border border-line bg-paper-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="btn btn--ghost btn--sm text-red disabled:opacity-30"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-line bg-paper-2 px-4 py-6 text-center text-[14px] text-mute">
          No image yet — upload one below.
        </p>
      )}

      <div className="mt-4">
        <FileUpload
          kind="EVENT_MEDIA"
          accept="image/jpeg,image/png,image/webp"
          label="Upload image"
          hint="JPG, PNG or WebP · up to 8MB"
          onUploaded={onUploaded}
          onError={setError}
        />
      </div>
      {error && <p className="mt-2 text-[13px] text-red" role="alert">{error}</p>}
    </section>
  );
}
