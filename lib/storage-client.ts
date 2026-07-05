// Client-side upload helper. Uses XHR for real upload progress. For the local
// driver this POSTs multipart to /api/upload; the Blob driver in prod swaps to
// the @vercel/blob client-upload handshake (UPLOAD_PLAN.md §17) behind the same
// uploadFile() signature.
export interface UploadedFile {
  id: string;
  url: string | null;
  key: string;
  width?: number | null;
  height?: number | null;
  mime: string;
  kind: string;
  alt?: string | null;
}

export function uploadFile(
  file: File,
  kind: string,
  onProgress?: (pct: number) => void,
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);

    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: { file?: UploadedFile; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        return reject(new Error("Upload failed."));
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.file) resolve(body.file);
      else reject(new Error(body.error || "Upload failed."));
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection."));
    xhr.send(form);
  });
}
