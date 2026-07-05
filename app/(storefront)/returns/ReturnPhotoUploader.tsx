"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/FileUpload";
import type { UploadedFile } from "@/lib/storage-client";

interface Photo {
  id: string;
  url: string;
}

// Customer RETURN/RMA photo uploader. Uploads RETURN_PHOTO images (public,
// multiple), keeps the uploaded {id,url} list, and renders a hidden
// `photoIds` input per photo so the createReturn server action can attach
// them to the new Return after it is created. See UPLOAD_PLAN.md (returns).
export function ReturnPhotoUploader() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);

  function onUploaded(f: UploadedFile) {
    if (!f.url) return;
    setError(null);
    setPhotos((prev) =>
      prev.some((p) => p.id === f.id) ? prev : [...prev, { id: f.id, url: f.url as string }],
    );
  }

  function remove(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      {photos.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4" aria-label="Uploaded return photos">
          {photos.map((p) => (
            <li key={p.id} className="group relative overflow-hidden rounded-md border border-line bg-paper-3">
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => remove(p.id)}
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded bg-paper text-red hover:bg-red-wash"
                >
                  ×
                </button>
              </div>
              <input type="hidden" name="photoIds" value={p.id} />
            </li>
          ))}
        </ul>
      )}

      <FileUpload
        kind="RETURN_PHOTO"
        multiple
        accept="image/jpeg,image/png,image/webp"
        label="Upload a photo of the issue (optional)"
        hint="JPG, PNG or WebP · up to 8MB each"
        onUploaded={onUploaded}
        onError={setError}
      />
      {error && <p className="mt-2 text-[13px] text-red" role="alert">{error}</p>}
    </div>
  );
}
