"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/ui/FileUpload";
import type { UploadedFile } from "@/lib/storage-client";
import { addProductImage, removeProductImage, reorderProductImages } from "./image-actions";

interface Img {
  id: string;
  url: string;
  alt: string | null;
}

// Admin product gallery: upload (multi), reorder via keyboard-accessible
// arrows, and remove. Renders from the server-provided `images` (ordered),
// mutates via server actions, then refreshes. See UPLOAD_PLAN.md §19.
export function ProductImageManager({ productId, images }: { productId: string; images: Img[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onUploaded(f: UploadedFile) {
    startTransition(async () => {
      try {
        await addProductImage(productId, f.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't attach image.");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeProductImage(id);
      router.refresh();
    });
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.map((i) => i.id);
    [next[idx], next[j]] = [next[j], next[idx]];
    startTransition(async () => {
      await reorderProductImages(productId, next);
      router.refresh();
    });
  }

  return (
    <section className="mt-8 rounded-lg border border-line bg-paper p-5">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">Product images</h2>
      <p className="mt-1 text-[13px] text-steel">Up to 8 images. The first is the primary. Drag-reorder via the arrows.</p>

      {images.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-line bg-paper-2 px-4 py-6 text-center text-[14px] text-mute">
          No images yet — add the product&apos;s first photo below.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4" aria-label="Product images, in display order">
          {images.map((img, idx) => (
            <li key={img.id} className="group relative overflow-hidden rounded-md border border-line bg-paper-3">
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt ?? ""} className="h-full w-full object-cover" />
                {idx === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-blue px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-white">
                    Primary
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 border-t border-line bg-paper px-1.5 py-1">
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    aria-label="Move image earlier"
                    disabled={idx === 0 || pending}
                    onClick={() => move(idx, -1)}
                    className="grid h-7 w-7 place-items-center rounded text-steel hover:bg-paper-2 disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    aria-label="Move image later"
                    disabled={idx === images.length - 1 || pending}
                    onClick={() => move(idx, 1)}
                    className="grid h-7 w-7 place-items-center rounded text-steel hover:bg-paper-2 disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Remove image"
                  disabled={pending}
                  onClick={() => remove(img.id)}
                  className="grid h-7 w-7 place-items-center rounded text-red hover:bg-red-wash disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <FileUpload
          kind="PRODUCT_IMAGE"
          multiple
          accept="image/jpeg,image/png,image/webp"
          label="Drag product images here or browse"
          hint="JPG, PNG or WebP · up to 8MB each"
          onUploaded={onUploaded}
          onError={setError}
        />
      </div>
      {error && <p className="mt-2 text-[13px] text-red" role="alert">{error}</p>}
    </section>
  );
}
