# VSK Sports — File Upload & Storage: Audit + Implementation Plan

> Status: **PROPOSAL — not yet built.** Awaiting storage-provider decision + sign-off.
> Stack: Next.js 16 (App Router) · React 19 · Prisma 6 · Postgres · NextAuth v5 · Vercel target.

---

## 1. Gap audit (confirmed against the codebase)

**Foundation — 100% absent:**
- `type="file"` inputs in the app: **0** (grep across all `*.tsx`).
- Storage SDK (UploadThing / Cloudinary / `@aws-sdk` / `@vercel/blob`): **0** in `package.json` + source.
- Reusable `<FileUpload>` / dropzone / media-library: **none**. The only "media" component is
  `components/motifs/MediaImage` (+ `_lib/ui.tsx` `Thumb`) — a **visual placeholder** replacing the
  prototype's `<image-slot>`; it renders `src`/`placeholder` only, no upload capability.
- Central `File` / `Media` / `Asset` / `Attachment` Prisma model: **none**.

**Per-feature verdict (PARTIAL = data field exists but no upload UI; ABSENT = no field + no UI):**

| # | Feature | DB model state | Upload UI | Verdict | Evidence |
|---|---------|----------------|-----------|---------|----------|
| 1 | Product images | `ProductImage{url,alt,position}` ✅ well-formed, `Product.images[]` | none | **PARTIAL** | schema 174,183–190 — populated only by seed URLs |
| 2 | Profile avatar | `User.image String?` ✅ | none | **PARTIAL** | schema 37 — OAuth-style field, no self-upload |
| 3 | Blog media | `BlogPost.coverImage String?` ✅ (single URL) | none | **PARTIAL** | schema 494 — no upload, no inline body media |
| 4 | Event / Training media | `Event.imageNote` / `TrainingBatch.imageNote` = **placeholder text only**, not a URL | none | **ABSENT** | schema 460,482 — needs real image field |
| 5 | Review photos | no field on `Review` | none | **ABSENT** | schema 320–334 |
| 6 | Return photos | no field on `Return`/`ReturnItem` | **fake placeholder** ("Upload a photo of the issue") | **ABSENT** | `returns/page.tsx:182` renders `MediaImage`, no input/persistence |
| 7 | Dealer documents | no file fields on `DealerApplication` (only text: gst#, businessType…) | none | **ABSENT** | schema 410–431 — no GST cert / licence upload |
| 8 | Order documents | no attachment on `Order`/`OrderItem`/`OrderEvent` | none | **ABSENT** | schema 256–302,511 — invoices generated, none uploaded |

**Bottom line:** your "uploads missing everywhere" is correct for UI/functionality (0% built). The data
layer is ~30% there: products, avatar, blog cover have a URL field; the other five need new
fields/models. Nothing has a storage backend or upload path.

---

## 2. Storage recommendation

**Primary recommendation: Vercel Blob** (`@vercel/blob`) behind a thin storage adapter.

Why it fits Next 16 + Vercel + Postgres best:
- **Native to your deploy target** — no extra vendor/account/billing; one SDK.
- **Client (presigned) uploads** that bypass Vercel's **4.5 MB serverless request-body limit** — the single
  most important constraint here. Server-proxied uploads would cap files at 4.5 MB and burn function time.
- S3-backed, scalable; supports **public** (product/avatar/blog) and **private/token** (dealer & order docs) access.
- Pairs with `next/image` for optimization; file **metadata lives in your existing Postgres** (`File` model).

Comparison:
| Provider | Best at | Trade-off |
|----------|---------|-----------|
| **Vercel Blob** ⭐ | Native DX, mixed images+PDFs, public+private, presigned client uploads | Newer; fewer image transforms (use `next/image`) |
| Cloudinary | Image transforms, responsive, built-in DAM/media-library UI | Media-focused (weaker for PDFs/docs); extra vendor + transform cost |
| UploadThing | Fastest to wire (`<UploadButton>` + route) | Extra vendor + pricing; less control |
| Raw S3 (+CloudFront) | Cheapest at scale, max control | Most setup (presign, CORS, policy, CDN); no built-in transforms |

**Design choice:** wrap whichever provider in `lib/storage/adapter.ts` (`put`, `delete`, `presignUpload`,
`getUrl`) so feature code never imports the SDK directly → swapping providers later is one file.

---

## 3. Cross-cutting design (applies to every feature)

- **Public vs private buckets/access:** product images, avatars, blog/event media, review photos → **public**.
  Dealer documents & order documents → **private** (signed, time-limited URLs + role checks). This drives ACL.
- **Upload pattern:** presigned **client→storage** direct upload (bypasses 4.5 MB limit) → on complete, a
  server action records a `File` row in Postgres and links it to the entity.
- **Validation:** allowed MIME + max size per `kind` (e.g. images ≤8 MB jpg/png/webp; docs ≤15 MB pdf),
  enforced both client (UX) and server (trust).
- **`next.config` `images.remotePatterns`** must include the blob host so `next/image` can serve uploads.
- **Orphan cleanup:** files uploaded but never attached → a `status` flag + periodic sweep.

---

## 4. Data model (new)

```prisma
enum FileKind { PRODUCT_IMAGE AVATAR BLOG_MEDIA EVENT_MEDIA REVIEW_PHOTO RETURN_PHOTO DEALER_DOC ORDER_DOC OTHER }
enum FileVisibility { PUBLIC PRIVATE }

model File {
  id          String         @id @default(cuid())
  key         String         @unique          // storage key/path
  url         String                            // public URL or canonical ref
  mime        String
  sizeBytes   Int
  width       Int?
  height      Int?
  kind        FileKind       @default(OTHER)
  visibility  FileVisibility @default(PUBLIC)
  uploadedById String?
  uploadedBy  User?          @relation(fields: [uploadedById], references: [id])
  status      String         @default("attached") // "pending" | "attached"
  createdAt   DateTime       @default(now())
  // back-relations added per feature in Phase 2
}
```
Per-feature linkage: reuse existing `ProductImage`/`User.image`/`BlogPost.coverImage`; add new join
models/fields for `ReviewPhoto`, `ReturnPhoto`, `DealerDocument`, `OrderDocument`, and a real
`Event.imageFileId`/`imageUrl`.

---

## 5. Phased plan

### Phase 0 — Decision & setup (no feature code)
- Confirm provider (see §2). Install SDK, add env vars (`BLOB_READ_WRITE_TOKEN` etc.), `images.remotePatterns`.

### Phase 1 — Foundation (the reusable system)
1. `File` model + enums → `prisma migrate`.
2. `lib/storage/adapter.ts` — provider-agnostic `put/delete/presignUpload/getSignedUrl`.
3. Upload server action + presign route (`app/api/upload/route.ts`) with auth + MIME/size validation.
4. **`<FileUpload>`** client component — drag-drop, multi/single, accept filter, progress, preview, error states.
5. **Media library**: `/admin/media` (browse/search/filter/delete) + **`<MediaPicker>`** modal to reuse existing files.
**Exit:** can upload a file from `/admin/media`, see it persisted as a `File` row, and reuse it.

### Phase 2 — Wire features (each = schema link + UI + server action; independent, parallelizable)
- 2a **Product images** — multi-upload + drag-reorder + alt text in admin product new/edit (uses `ProductImage`).
- 2b **Profile avatar** — single-image upload + crop on `/profile` (uses `User.image`).
- 2c **Blog media** — cover upload + inline body images in admin blog edit (uses `coverImage` + `BlogMedia`).
- 2d **Event/Training media** — replace `imageNote` text with real `imageUrl`/`File`; upload in admin.
- 2e **Review photos** — new `ReviewPhoto` (1..n) on `/reviews/write`; show in product gallery (moderated).
- 2f **Return photos** — wire the existing `returns/page.tsx` placeholder to real upload → `ReturnPhoto`.
- 2g **Dealer documents** — GST/licence upload (PRIVATE) on dealer application + admin review viewer.
- 2h **Order documents** — admin upload invoices/labels (PRIVATE); customer download in order detail.

### Phase 3 — Hardening
- Private-file signed-URL access + role checks; image optimization via `next/image`; size/type abuse limits;
  orphan-file sweep; tests (upload validation, ACL, attach/detach); docs.

---

## 6. Decisions — LOCKED (via /plan-ceo-review, SELECTIVE EXPANSION mode)
1. **Approach: B — Foundation + adapter.** Provider-agnostic `lib/storage` adapter, central `File` model, reusable `<FileUpload>` + media library in Phase 1, then 8 features wired on top.
2. **Provider: Vercel Blob** (`@vercel/blob`), presigned client uploads. Swappable via the adapter.
3. **Mode: Selective Expansion** — 8-feature baseline held + hardened; expansions cherry-picked below.
4. **Private docs (dealer + order): access-controlled** — token/signed URLs, **15-min TTL default**, never public.

## 7. Accepted expansions (now in scope)
| Expansion | What it adds | Impl note |
|-----------|--------------|-----------|
| **EXIF-strip + re-encode** | strip GPS/metadata from user photos; re-encode to kill embedded payloads | run on image ingest in the attach step (`sharp`); set `File.sanitized=true` |
| **Virus/content scan** | scan dealer/order PDFs before staff download | scan hook on private-doc upload; `File.scanStatus` = pending/clean/flagged; block download until clean |
| **AI alt-text** | auto alt text on product/blog/review images (Claude vision) | async after attach; store on `ProductImage.alt` / `File.alt`; human-overridable |
| **Image variants + bulk/reorder (polish)** | responsive sizes + admin bulk-upload + drag-reorder | variants via `sharp` on ingest; reorder writes `ProductImage.position` |

Model additions for expansions: `File.sanitized Boolean`, `File.scanStatus String?`, `File.alt String?`, `File.variants Json?`.

## 8. Architecture (review §1)
```
 Browser <FileUpload>
   │ 1. ask presign ───────▶ POST /api/upload/presign  (auth + mime/size validation)
   │ 2. PUT file direct ───▶ Vercel Blob               (bypasses 4.5MB serverless body limit)
   │ 3. notify complete ───▶ server action attachFile():
   │                          • EXIF-strip + re-encode + variants (sharp, images)
   │                          • scan (private docs) → scanStatus
   │                          • create File row (status=attached) + link to entity
   ▼                                   │
 preview / progress / error      Postgres (File + ProductImage/ReviewPhoto/…)
```
**Data-flow shadow paths:** nil/empty file → client blocks + server 400. Oversize/bad-MIME → rejected before presign. PUT fails mid-upload → `File` stays `pending` → GC sweeps. Attach fails after PUT → orphan blob → GC sweeps. Private doc with `scanStatus≠clean` → download blocked, staff sees "scanning".

## 9. Error & Rescue Registry (review §2)
| Codepath | Failure | Exception | Rescued? | Action | User sees |
|----------|---------|-----------|----------|--------|-----------|
| presign route | not authed | `UnauthorizedError` | Y | 401 | "Sign in to upload" |
| presign route | bad mime/oversize | `ValidationError` | Y | 400, no presign | inline field error |
| client PUT | network drop mid-upload | fetch reject | Y | retry 2x, then surface | "Upload failed, retry" |
| attachFile | sharp throws on corrupt image | `ImageProcessError` | Y | reject, no File row | "Couldn't process image" |
| attachFile | scan service down | `ScanUnavailable` | Y | File saved `scanStatus=pending`, alert | "Uploaded, scanning…" |
| attachFile | DB write fails after PUT | `PrismaError` | Y | log + mark blob orphan for GC | "Upload failed, retry" |
| alt-text job | Claude API error/refusal | `AltTextError` | Y | leave alt empty, log, retry later | nothing (degrades silently, by design) |
| private download | IDOR (wrong owner/role) | `ForbiddenError` | Y | 403 | "Not found" (no leak) |

**No catch-all** (`catch (e)`) — every path names its exception. Zero silent failures except alt-text (intentional graceful degrade).

## 10. Security threat model (review §3)
| Threat | Likelihood | Impact | Mitigated by |
|--------|-----------|--------|--------------|
| Malicious file payload (polyglot/SVG-XSS) | Med | High | EXIF-strip + **re-encode** images; block SVG; CSP |
| Malware in dealer/order PDF | Med | High | **virus scan** gate before any download |
| IDOR on private docs (user B reads A's GST cert) | Med | High | File access scoped by owner/role; signed URL 15-min TTL |
| Unrestricted upload (storage/cost abuse) | Med | Med | auth-gated presign, per-kind MIME+size caps, rate limit |
| GPS/PII leak via photo EXIF | High | Med | **EXIF strip** on ingest |
| Prompt injection via alt-text image | Low | Low | treat model output as untrusted text, escape on render |

## 11. Interaction edge cases (review §4)
Double-submit upload → idempotent presign key. Navigate away mid-upload → `File` pending → GC. Reorder during concurrent edit → `position` last-write-wins + refetch. 10k media items → paginate + search in media library. Re-upload same file → dedupe by content hash (optional). Delete a File still linked → block + show references.

## 12. Test plan (review §6)
Unit: MIME/size validation, EXIF-strip removes GPS, re-encode strips payload, IDOR rejection, scan-gate blocks download. Integration: presign→PUT→attach happy path; orphan GC sweep; alt-text fallback on API error. E2E: admin adds 3 product images + reorders; customer uploads return photo; dealer uploads GST doc → staff download blocked until scan clean. Chaos: scan service down, Blob 500 mid-PUT, attach fails post-PUT.

## 13. Observability (review §8)
Structured logs at presign / attach / scan / download (with userId, kind, size). Metrics: upload success rate, p99 attach latency, scan queue depth, orphan count, alt-text failure rate. Alerts: scan service down, orphan count > N, upload error rate spike. Admin: media library doubles as the operational view.

## 14. Deploy & rollout (review §9)
Migrations are additive (new `File` + columns + join models) → backward-compatible, zero-downtime. Env: `BLOB_READ_WRITE_TOKEN`, scan-service key, `ANTHROPIC_API_KEY` (alt-text). `next.config` `images.remotePatterns` += blob host. Ship behind no flag (additive), but gate the *return/review photo* storefront UI behind a flag for staged rollout. Rollback: revert deploy; `File` rows harmless if unused.

## 15. Failure Modes Registry
| Codepath | Failure | Rescued? | Test? | User sees | Logged? |
|----------|---------|----------|-------|-----------|---------|
| presign | authz/validation | Y | Y | error msg | Y |
| PUT | network | Y | Y | retry | Y |
| attach | process/db | Y | Y | error msg | Y |
| scan | service down | Y | Y | "scanning" | Y (alert) |
| download | IDOR | Y | Y | 403/"not found" | Y |
| alt-text | API error | Y | Y | nothing (by design) | Y |
**Zero CRITICAL GAPS** (no row is unrescued + untested + silent).

## 16. Scope boundaries
**NOT in scope:** video transcoding, public CDN tuning, multi-region replication, full DAM tagging taxonomy, user-facing image editor. **What already exists (reused, not rebuilt):** `ProductImage`, `User.image`, `BlogPost.coverImage`, `MediaImage`/`Thumb` display components. **Dream-state delta:** lands the adapter + File model + sanitization + alt-text — the load-bearing pieces of the 12-month DAM; defers transforms-at-scale and tagging.

## 17. Updated phased plan
- **Phase 0** — install `@vercel/blob` + `sharp`, env vars, `remotePatterns`.
- **Phase 1** — `File` model (+ expansion columns), `lib/storage` adapter, presign route + `attachFile` (with EXIF-strip/re-encode/variants/scan hooks), `<FileUpload>`, media library + `<MediaPicker>`, orphan GC.
- **Phase 2** — wire 8 features (2a product images + bulk/reorder, 2b avatar, 2c blog, 2d event/training, 2e review photos, 2f return photos, 2g dealer docs [private+scan], 2h order docs [private+scan]).
- **Phase 2.5** — AI alt-text job across image features.
- **Phase 3** — hardening: signed-URL ACL, tests, observability, abuse limits.

## 18. Eng review additions (supersedes §8 upload sketch)

**Corrected upload flow — temp-then-publish + Blob built-in client upload** (do NOT hand-roll presigned URLs; use `@vercel/blob/client` `upload()` + a route handler with `handleUpload`):
```
 1. client upload() ──direct──▶ Blob TEMP (private)        [bypasses 4.5MB fn body limit]
 2. Blob onUploadCompleted ─▶ /api/upload/complete (Node runtime):
       ├─ fetch temp bytes
       ├─ images: EXIF-strip + re-encode + variants (sharp)
       ├─ docs:   virus scan → scanStatus
       ├─ write FINAL blob (public=media / private=docs), DELETE temp
       └─ File → status=attached, sanitized=true, url set
 3. alt-text: async (Vercel Cron) ─▶ Claude vision ─▶ File.alt
 serve: File.url stays NULL until step 2 succeeds → un-sanitized files are never reachable
```
**File state machine:**
```
 uploaded ─▶ processing ─┬─▶ clean   ─▶ attached    (url published)
                         └─▶ flagged ─▶ quarantined (never served, staff alerted)
 stuck > TTL ─▶ orphan ─▶ GC deletes blob + row
```

**Sequencing (eng decision):** phased. **Increment 1 = foundation + product images** (proves the loop end-to-end); feature groups follow as separate increments.

**Test coverage targets (100% of new paths):**
```
CODE PATHS                                      USER FLOWS / E2E
lib/storage adapter put/delete/signedUrl [★★]   [→E2E] admin: upload 3 images + reorder + save
/api/upload/complete:                           [→E2E] customer: attach return photo to RMA
  ├ EXIF-strip removes GPS         [★★★]        [→E2E] dealer: upload GST doc → staff download
  ├ re-encode strips payload       [★★★]                blocked until scanStatus=clean
  ├ scan → clean / flagged         [★★★]        [GAP] double-submit / navigate-away mid-upload
  ├ process fail → retry → flag    [★★]         [GAP] Blob 500 mid-upload → retry UX
  ├ IDOR on private file (403)     [★★★]        [GAP] scan service down → "scanning" state
orphan GC sweep                    [★★]         alt-text quality              [→EVAL small set]
```
**Regression note:** none (greenfield); all paths are new.

**Performance:** media-library list → paginate + index `File(kind, createdAt)`, `include` feature relations (no N+1). Variant gen capped (max dimension) in the single processing pass. Signed-URL gen cheap; add blob host to `next.config` `images.remotePatterns`.

**Worktree parallelization (after foundation merges):**
```
Lane A (foundation): File model + adapter + /complete + <FileUpload> + media library  [BLOCKS all]
Then parallel:  B product-images+reorder · C avatar · D blog+event · E review+return photos
                F dealer+order docs (private+scan) · G alt-text cron
```
B–G consume the shared `<FileUpload>`/`File` API read-only → low merge-conflict risk.

## 19. Design specs (review §design — calibrated to VSK tokens in `assets/vsk.css`)

Visual language: cobalt `#1B43C8` primary, Space Grotesk / Spline Sans Mono, radius 4/8/14, target-ring/reticle/dotgrid motifs. Upload widgets reuse the existing `.dropz` style + `MediaImage`/`Thumb` so they read as native VSK, not bolted on.

**Interaction-state coverage:**
| Widget | Uploading | Empty | Error | Processing (scan/strip) | Success |
|---|---|---|---|---|---|
| `<FileUpload>` | per-file progress bars + % | dashed `.dropz` "Drag files or browse" + reticle tick | inline red + Retry/Remove | optimistic preview + "scanning…" pill | solid thumb + ✓ |
| Media library `/admin/media` | skeleton grid (8 tiles) | warm: target-ring art + "No media yet — upload your first file" CTA | toast + Retry panel | "scanning" badge on tile | thumb grid + filters |
| Product gallery | per-tile progress | "No images — add up to 8" | failed tile keeps Retry | scanning pill on new tiles | drag-reorder enabled |
| Avatar | spinner over circle | initials/monogram fallback | "Upload failed", keep old | blurred preview + spinner | new avatar, subtle pop |
| Review/return photo | thumb progress | "Add photos (optional)" `.dropz` | inline, dismissible (optional) | "scanning…" then thumb | thumb row |
| Dealer/order doc (private) | filename + progress | "Upload GST/licence (PDF)" | inline + Retry | 🔒 "Scanning for safety…", download disabled | filename + ✓ + download |

**Processing-state UX (decision):** **optimistic local preview + scanning badge.** On select, render the user's own file via `URL.createObjectURL` immediately with a corner spinner + "scanning…" pill (cobalt on `--blue-wash`); swap to the real published URL when the File row hits `attached`; if `flagged`, flip the tile to an error state ("Couldn't use this file"). The local preview is client-side only (the user's own bytes), never the un-sanitized published URL — no security regression. Revoke the object URL on swap/unmount.

**Accessibility:** real visually-hidden `<input type=file>` + visible `<label>` (drag-drop is enhancement; Enter/Space opens the picker); `aria-live="polite"` progress ("Uploading logo.png 60%" → "uploaded" / "failed, press Retry"); **keyboard-accessible reorder** (arrow keys move position, not drag-only) with `aria-` announcements; delete = confirm dialog + focus return; 44px min touch targets; all text incl. the scanning pill ≥4.5:1 contrast.

**Mobile:** tap-to-pick is primary (no hover/drag on touch); media library 2-col grid + filters in a bottom sheet + sticky search; gallery reorder exposes explicit up/down arrows (touch-drag as fallback); avatar crop as a full-screen sheet.

## 20. Implementation status — increment 1 (built + verified 2026-06-15)

**DONE — foundation + product images (runs locally on :3001):**
- **DB:** `File` model + `FileKind`/`FileVisibility`/`FileStatus` enums + `ProductImage.fileId` + indexes — migration `20260615135659_add_file_model`, applied.
- **`lib/storage.ts`:** provider adapter (`STORAGE_DRIVER=local|blob`), sharp **EXIF-strip + re-encode→WebP**, `UPLOAD_RULES` (per-kind mime/size/visibility/staff-gate).
- **`app/api/upload/route.ts`:** auth-gated server-proxied upload (Node runtime) → validate → sanitize → store → `File` row.
- **`lib/storage-client.ts` + `components/ui/FileUpload.tsx`:** reusable widget — drag-drop, progress, optimistic preview + "scanning" badge, inline error, a11y (hidden input + label, `aria-live`).
- **Product images wired:** `image-actions.ts` (add/remove/reorder, staff-gated) + `ProductImageManager.tsx` (gallery, keyboard reorder arrows, remove, primary badge) in admin product edit.
- **Media library `/admin/media`:** server page (filter by kind + search + pagination on the `File(kind, createdAt)` index) + `MediaGrid` (browse, upload, delete with in-use protection) + sidebar nav entry. Verified: page 200, empty state, upload round-trip shows thumbnail.
- **Security hardening:** (1) Blob driver refuses `PRIVATE` writes; `/api/upload` rejects `PRIVATE` kinds when `STORAGE_DRIVER=blob` (no silent PII exposure to public URLs). (2) `/api/files/[id]` serves private docs as `attachment` + `nosniff` + CSP `sandbox` with a sanitized filename — closes same-origin XSS via uploaded doc bytes. Per-kind MIME allowlist already blocks `text/html`/`svg` for docs.
- **Verified E2E:** admin upload → PNG re-encoded to WebP 543×459, EXIF stripped, `File` row created, file on disk; edit page renders the manager (200). Smoke scripts: `scripts/test-upload.mjs`, `scripts/verify-edit.mjs`. Dev storage = `public/uploads` (gitignored).

**DONE — full feature set (agent-team build, verified 2026-06-15):**
- **Schema:** 4 new models (`ReviewPhoto`, `ReturnPhoto`, `DealerDocument`, `OrderDocument`) + `Event`/`TrainingBatch` `imageUrl`/`imageFileId` — migration `20260615174432_add_media_features`.
- **Private-file download route** `app/api/files/[id]`: auth + owner-or-staff + scan-clean gate (verified: admin 200, anon 401).
- **All 7 features wired** (each reuses `<FileUpload>` + the ProductImage pattern): avatar (`/profile`), blog cover (admin blog edit), event + training media (admin), review photos (write-review), return photos (RMA step 2), dealer docs (application form → admin review, PRIVATE), order docs (admin order detail → customer view, PRIVATE).
- **Bonus:** the dealer-application form was cosmetic (no persistence) — now wired to a real `submitDealerApplication` action.
- **Verified:** full `tsc --noEmit` clean; smoke test — every new page 200, public + private upload round-trips, private download gated.

**NOT YET — later increments (per §17):**
- `<MediaPicker>` reuse modal (pick an existing library file into a feature) — Phase 1 remainder.
- Prod hardening: Blob **client-upload handshake** for >4.5MB + private docs; **real virus scan** (dev stubs `clean`); **async AI alt-text** (Vercel Cron); **orphan GC** sweep.
- Formal test suite (vitest unit + E2E per §18) — only smoke scripts exist so far.

## GSTACK REVIEW REPORT
| Review | Status | Findings |
|--------|--------|----------|
| CEO Review (`/plan-ceo-review`) | DONE | Selective Expansion. 4 expansions proposed, **4 accepted**, 0 deferred. 0 critical gaps. |
| Eng Review (`/plan-eng-review`) | DONE | Sequencing→phased. 1 P1 (serve-window→temp-then-publish), 2 P2 (async infra, state machine). Test diagram: 4 E2E + 1 eval + 3 edge gaps specced. |
| Design Review (`/plan-design-review`) | DONE | Scope A (states/mobile/a11y). Score 5→9. Interaction-state table + processing-state UX (optimistic preview) + a11y + mobile specced. 1 decision resolved. |
| DevEx Review (`/plan-devex-review`) | pending | weak fit (end-user feature, not a dev product) |

**VERDICT:** CEO + ENG + DESIGN CLEARED — ready to implement (phased, increment 1 = foundation + product images).
**Note:** gstack telemetry/logging + design-mockup binary skipped — no git repo + project context-mode rules + Windows env.
