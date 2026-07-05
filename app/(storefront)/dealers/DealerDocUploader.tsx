"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/FileUpload";
import type { UploadedFile } from "@/lib/storage-client";

// Customer dealer-application document uploader. Uploads DEALER_DOC files
// (PRIVATE — GST cert / trade licence) and tracks their File ids in hidden
// inputs so the surrounding application form posts `docIds` to the create
// action. Private files have a null url, so we never render a preview —
// we list filename + a remove control. See UPLOAD_PLAN.md §19.

interface Doc {
  id: string;
  name: string;
}

function nameFromKey(key: string): string {
  return key.split("/").pop() || "Document";
}

export function DealerDocUploader() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState<string | null>(null);

  function onUploaded(f: UploadedFile) {
    setError(null);
    setDocs((prev) =>
      prev.some((d) => d.id === f.id) ? prev : [...prev, { id: f.id, name: nameFromKey(f.key) }],
    );
  }

  function remove(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="field field--full">
      <label>GST certificate / trade licence</label>

      {docs.length > 0 && (
        <ul style={{ display: "grid", gap: 8, margin: "8px 0 12px", listStyle: "none", padding: 0 }}>
          {docs.map((d) => (
            <li
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 12px",
                border: "1px solid var(--line)",
                borderRadius: 8,
                background: "#fff",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="var(--steel)" strokeWidth={2}>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.name}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${d.name}`}
                onClick={() => remove(d.id)}
                className="btn btn--ghost btn--sm"
                style={{ color: "var(--red)", borderColor: "var(--red-wash)", flexShrink: 0 }}
              >
                Remove
              </button>
              {/* Posted to submitDealerApplication; linked as DealerDocument rows. */}
              <input type="hidden" name="docIds" value={d.id} />
            </li>
          ))}
        </ul>
      )}

      <FileUpload
        kind="DEALER_DOC"
        multiple
        accept="application/pdf,image/jpeg,image/png"
        label="Upload GST / licence (PDF or image)"
        hint="PDF, JPG or PNG · up to 15MB"
        maxBytes={15 * 1024 * 1024}
        onUploaded={onUploaded}
        onError={setError}
      />
      {error && (
        <p style={{ marginTop: 8, color: "var(--red)", fontSize: 13 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
