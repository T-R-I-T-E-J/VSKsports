"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/FileUpload";
import type { UploadedFile } from "@/lib/storage-client";

interface Photo {
  id: string;
  url: string;
}

// Customer review photo uploader. Each picked image is uploaded immediately
// (creating a File of kind REVIEW_PHOTO via /api/upload), then tracked here.
// The review <form> submits one hidden `photoIds` input per uploaded photo;
// the submitReview action turns those into ReviewPhoto rows after creating
// the Review. Removing a thumbnail only drops it from this list (the orphan
// File is cleaned up server-side / left unattached).
export function ReviewPhotoUploader() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);

  function onUploaded(f: UploadedFile) {
    if (!f.url) return;
    setPhotos((prev) =>
      prev.some((p) => p.id === f.id) ? prev : [...prev, { id: f.id, url: f.url as string }]
    );
  }

  function remove(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      {photos.length > 0 && (
        <ul className="dropz-row" style={{ marginBottom: 12 }} aria-label="Uploaded review photos">
          {photos.map((p) => (
            <li key={p.id} style={{ position: "relative", listStyle: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt="Review photo"
                className="h-[74px] w-full rounded border border-(--line)"
                style={{ objectFit: "cover" }}
              />
              <input type="hidden" name="photoIds" value={p.id} />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => remove(p.id)}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(17,17,17,.72)",
                  color: "#fff",
                  fontSize: 13,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <FileUpload
        kind="REVIEW_PHOTO"
        multiple
        accept="image/jpeg,image/png,image/webp"
        label="Add photos (optional)"
        hint="JPG, PNG or WebP"
        onUploaded={onUploaded}
        onError={setError}
      />
      {error && (
        <p style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12, marginTop: 8 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
