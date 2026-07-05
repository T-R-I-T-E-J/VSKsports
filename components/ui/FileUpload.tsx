"use client";

import { useId, useRef, useState } from "react";
import { uploadFile, type UploadedFile } from "@/lib/storage-client";

// Reusable upload widget: drag-drop + click/keyboard, per-file progress,
// optimistic local preview with a "scanning" badge, and inline error/retry.
// It owns only the in-flight chips; the parent persists results via onUploaded.
// Matches the interaction-state spec in UPLOAD_PLAN.md §19.

type ItemStatus = "uploading" | "scanning" | "done" | "error";
interface Item {
  localId: string;
  name: string;
  preview: string | null;
  status: ItemStatus;
  progress: number;
  error?: string;
}

export interface FileUploadProps {
  kind: string;
  multiple?: boolean;
  accept?: string;
  maxBytes?: number;
  label?: string;
  hint?: string;
  onUploaded?: (file: UploadedFile) => void;
  onError?: (message: string) => void;
}

let _seq = 0;

export function FileUpload({
  kind,
  multiple = false,
  accept = "image/jpeg,image/png,image/webp",
  maxBytes = 8 * 1024 * 1024,
  label = "Drag files here or browse",
  hint,
  onUploaded,
  onError,
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);

  function patch(localId: string, next: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, ...next } : it)));
  }

  function clearLater(localId: string) {
    window.setTimeout(() => setItems((prev) => prev.filter((it) => it.localId !== localId)), 1400);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).slice(0, multiple ? undefined : 1);
    for (const file of files) {
      const localId = `u${_seq++}`;
      const accepted = accept.split(",").map((s) => s.trim());
      const isImage = file.type.startsWith("image/");
      const preview = isImage ? URL.createObjectURL(file) : null;

      if (accepted.length && !accepted.includes(file.type)) {
        setItems((p) => [...p, { localId, name: file.name, preview, status: "error", progress: 0, error: "Type not allowed" }]);
        onError?.(`${file.name}: type not allowed`);
        continue;
      }
      if (file.size > maxBytes) {
        setItems((p) => [...p, { localId, name: file.name, preview, status: "error", progress: 0, error: `Over ${Math.floor(maxBytes / 1048576)}MB` }]);
        onError?.(`${file.name}: too large`);
        continue;
      }

      setItems((p) => [...p, { localId, name: file.name, preview, status: "uploading", progress: 0 }]);
      try {
        const uploaded = await uploadFile(file, kind, (pct) =>
          patch(localId, { progress: pct, status: pct >= 100 ? "scanning" : "uploading" }),
        );
        patch(localId, { status: "done", progress: 100 });
        if (preview) URL.revokeObjectURL(preview);
        onUploaded?.(uploaded);
        clearLater(localId);
      } catch (e) {
        patch(localId, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
        onError?.(e instanceof Error ? e.message : "Upload failed");
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging ? "border-blue bg-blue-wash" : "border-line bg-paper-2 hover:border-blue-2"
        }`}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">Upload</span>
        <span className="text-[14px] font-medium text-ink">{label}</span>
        {hint && <span className="text-[12px] text-steel">{hint}</span>}
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />
      </label>

      {items.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4" aria-live="polite">
          {items.map((it) => (
            <li key={it.localId} className="relative overflow-hidden rounded-md border border-line bg-paper">
              <div className="relative aspect-square bg-paper-3">
                {it.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.preview} alt="" className={`h-full w-full object-cover ${it.status === "scanning" ? "blur-[1px]" : ""}`} />
                ) : (
                  <div className="grid h-full place-items-center font-mono text-[10px] text-mute">{it.name.split(".").pop()?.toUpperCase()}</div>
                )}

                {(it.status === "uploading" || it.status === "scanning") && (
                  <div className="absolute inset-x-0 bottom-0 bg-ink/70 px-1.5 py-1">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
                      <div className="h-full bg-white transition-all" style={{ width: `${it.progress}%` }} />
                    </div>
                    <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wide text-white">
                      {it.status === "scanning" ? "Scanning…" : `${it.progress}%`}
                    </span>
                  </div>
                )}

                {it.status === "done" && (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-blue text-[11px] text-white">✓</span>
                )}

                {it.status === "error" && (
                  <div className="absolute inset-0 grid place-items-center bg-red-wash/90 px-2 text-center">
                    <span className="text-[11px] font-medium text-red-ink">{it.error}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
