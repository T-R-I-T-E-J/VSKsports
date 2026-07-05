"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/ui/FileUpload";
import type { UploadedFile } from "@/lib/storage-client";
import { attachOrderDoc, removeOrderDoc } from "./order-doc-actions";

interface Doc {
  id: string;
  fileId: string;
  label: string | null;
  docType: string | null;
  file: { mime: string } | null;
}

// Admin order documents: staff upload invoices / shipping labels (PRIVATE,
// kind ORDER_DOC) and remove them. Files are downloaded via the auth-gated
// route /api/files/<fileId> — never rendered inline (url is null for private
// kinds). Renders from server-provided `documents`, mutates via server
// actions, then refreshes.
export function OrderDocManager({
  orderId,
  documents,
}: {
  orderId: string;
  documents: Doc[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onUploaded(f: UploadedFile) {
    startTransition(async () => {
      try {
        await attachOrderDoc(orderId, f.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't attach document.");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeOrderDoc(id);
      router.refresh();
    });
  }

  return (
    <div>
      {documents.length === 0 ? (
        <p className="muted" style={{ fontSize: 14, color: "var(--mute)" }}>
          No documents yet — upload an invoice or shipping label below.
        </p>
      ) : (
        <ul style={{ display: "grid", gap: 8, marginBottom: 14 }} aria-label="Order documents">
          {documents.map((doc) => (
            <li
              key={doc.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              <a
                href={`/api/files/${doc.fileId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 14, fontWeight: 600, color: "var(--blue)" }}
              >
                {doc.label ?? doc.docType ?? "Document"}
              </a>
              <button
                type="button"
                aria-label="Remove document"
                disabled={pending}
                onClick={() => remove(doc.id)}
                className="btn btn--ghost btn--sm"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <FileUpload
        kind="ORDER_DOC"
        multiple
        accept="application/pdf,image/jpeg,image/png"
        label="Upload invoice / label"
        hint="PDF, JPG or PNG · up to 15MB"
        onUploaded={onUploaded}
        onError={setError}
      />
      {error && (
        <p className="mt-2 text-[13px] text-red" role="alert" style={{ marginTop: 8, color: "var(--red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
