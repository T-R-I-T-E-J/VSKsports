"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/ui/FileUpload";
import type { UploadedFile } from "@/lib/storage-client";
import { initials } from "../account/_shared";
import { updateAvatar, removeAvatar } from "@/app/actions/avatar";

// Customer profile avatar: shows the current photo (or an initials monogram
// fallback), uploads a new PUBLIC AVATAR via the shared FileUpload, attaches it
// through the updateAvatar server action, then refreshes. Mirrors the admin
// ProductImageManager pattern (FileUpload + useTransition + router.refresh()).
export function AvatarUploader({
  currentImage,
  name,
}: {
  currentImage: string | null;
  name: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onUploaded(f: UploadedFile) {
    startTransition(async () => {
      try {
        await updateAvatar(f.id);
        setError(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't update your photo.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await removeAvatar();
        setError(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't remove your photo.");
      }
    });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        marginBottom: 24,
        paddingBottom: 24,
        borderBottom: "1px solid var(--line)",
      }}
    >
      {currentImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentImage}
          alt={name ?? "Profile photo"}
          width={96}
          height={96}
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            objectFit: "cover",
            border: "1px solid var(--line)",
            flexShrink: 0,
          }}
        />
      ) : (
        <span
          aria-hidden
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: "var(--blue)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 34,
            flexShrink: 0,
          }}
        >
          {initials(name)}
        </span>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <FileUpload
          kind="AVATAR"
          accept="image/jpeg,image/png,image/webp"
          label="Upload a new photo"
          hint="JPG, PNG or WebP · up to 4MB"
          onUploaded={onUploaded}
          onError={setError}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          {currentImage && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="btn btn--ghost btn--sm"
              style={{ color: "var(--red)", borderColor: "var(--red-wash)" }}
            >
              Remove photo
            </button>
          )}
          {error && (
            <span className="text-red" style={{ color: "var(--red)", fontSize: 13 }} role="alert">
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
