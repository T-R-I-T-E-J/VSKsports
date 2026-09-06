# Security Scan — vsk-sports

Date: 2026-08-11 · Scope: `app/`, `lib/`, `components/`, `middleware.ts`, `auth.config.ts`, `scripts/`, plus dependency tree.

## 1. Unsafe deserialization taint analysis

The pasted CodeQL query (`UnsafeDeserializationConfig`, `js/unsafe-deserialization`) is a Java/JS query. CodeQL CLI is not installed on this host, so the equivalent source→sink analysis was run manually.

**Result: 0 findings.** No path exists because there are **no sinks**.

Sinks searched across all `.ts/.tsx/.mjs` (excluding `node_modules`):

| Sink class | Patterns | Hits |
|---|---|---|
| Code injection | `eval(`, `new Function`, string `setTimeout`/`setInterval` | 0 |
| VM escape | `vm.run*`, `runInNewContext`, `runInThisContext` | 0 |
| Object deserialization | `unserialize`, `deserialize`, `node-serialize`, `funcster`, `cryo` | 0 |
| YAML | `yaml.load`, `loadAll`, `safeLoad` | 0 |
| Command exec | `child_process`, `execSync`, `spawnSync` | 0 |

`js-yaml` is present but only as a transitive dev dependency (ESLint); it is never imported by application code.

### JSON.parse paths (reviewed, not vulnerable)

`JSON.parse` is not an RCE sink in JS, but both call sites were traced anyway:

- **`app/api/webhooks/razorpay/route.ts:23`** — parses the raw request body (an attacker-reachable source). **Correctly guarded:** `verifyWebhookSignature(raw, signature)` runs at line 11, *before* the parse, and returns 400 on failure. `lib/razorpay.ts:36` computes HMAC-SHA256 over the raw body and compares with `crypto.timingSafeEqual` behind a length check, and fails closed when `RAZORPAY_WEBHOOK_SECRET` is unset. Downstream field access is fully optional-chained and the DB write is idempotent (`paymentStatus: { not: "PAID" }`). No issue.
- **`lib/storage-client.ts:34`** — parses `xhr.responseText` from the app's own upload endpoint. Wrapped, non-privileged. No issue.

### Prototype pollution

Only two `Object.assign` calls, both in `app/admin/(panel)/_lib/ui.tsx:130-131`, merging hardcoded literals into a local style object. No user-controlled key iteration. No issue.

## 2. Dependency vulnerabilities — 12 total (2 critical, 10 high)

`npm audit` results, with applicability assessed against this codebase:

### Critical

- **`@auth/core` ≤0.41.2** (via `next-auth@5.0.0-beta.31`, `@auth/prisma-adapter`)
  - OAuth state/nonce/PKCE cookies not bound to issuing provider (GHSA-x445-f3h2-j279) — **not applicable**: `lib/auth.ts:17` configures Credentials only, no OAuth providers.
  - `getToken()` uncaught exception on malformed Bearer header (GHSA-xmf8-cvqr-rfgj) — `getToken` is not called directly; reachable only through library internals.
  - Email homoglyph `@` bypass (GHSA-7rqj-j65f-68wh) — **not applicable**, no Email provider.
- **`nodemailer`** (direct dep, used by `lib/email/mailer.ts`) — pulled in as a vulnerable version by the same advisory chain.

### High

- **`next@16.2.9`** — 9 advisories: middleware/proxy bypass, Server Action DoS, SSRF in rewrites and on custom servers, cache confusion on bodied requests, unauthenticated disclosure of internal Server Function endpoints, Image Optimization SVG DoS. This is the highest-impact item: it is the framework, and several are directly reachable in an App Router app.
- **`undici@6.26.0`** (via `@vercel/blob`) — 7 advisories: header/CRLF injection, response queue poisoning, SameSite downgrade.
- **`sharp@0.34.5`** (nested under `next`) — inherited libvips CVEs (CVE-2026-33327/33328/35590/35591). Note the root `sharp@0.35.1` is patched; the nested copy is not.
- **`axios`**, **`brace-expansion`**, **`js-yaml`**, **`nanoid`**, **`postcss`** — transitive, mostly DoS; low practical exposure via dev tooling.

### Remediation

```
npm audit fix          # resolves @auth/core, nodemailer, undici, axios, js-yaml, nanoid, brace-expansion
npm audit fix --force  # required for next -> 16.3.0 (outside stated range) and nested sharp
```

The `next` upgrade to 16.3.0 is a major-ish bump outside `package.json`'s stated range — per `AGENTS.md`, check `node_modules/next/dist/docs/` for breaking changes before taking it, and run `npm test` after.

## 3. Remediation applied (2026-08-11)

`npm audit` now reports **0 vulnerabilities** (was 12). Verified with `tsc --noEmit` (clean), `npm test` (6/6 pass), `npm run build` (success).

| Package | Before | After | Notes |
|---|---|---|---|
| `next` + `eslint-config-next` | 16.2.9 | 16.3.0 | Also clears nested `postcss` and `sharp` |
| `nodemailer` | 7.0.13 | 9.0.5 | Major bump; only `createTransport`/`sendMail` used, both stable |
| `@auth/core` | 0.41.2 | 0.41.3 | Critical |
| `next-auth` | beta.31 | beta.32 | |
| `undici` | 6.26.0 | 6.28.0 | |

Only `package-lock.json` plus the `next`/`nodemailer` entries in `package.json` changed. Note: `npm i nodemailer@9` emitted an `ERESOLVE` peer warning against `@auth/core` (which expects nodemailer 7.x) — benign here because `@auth/core` only uses nodemailer for the Email provider, and this app is Credentials-only.

## 4. Broader vulnerability scan

**Clean:** no raw SQL (`$queryRaw*`/`$executeRawUnsafe`) anywhere — all access is via Prisma's parameterized client; no `dangerouslySetInnerHTML`/`innerHTML`/`document.write`; no hardcoded secrets or `NEXT_PUBLIC_*` secret leakage; `.env*` correctly gitignored with only `.env.example` tracked.

**Well-implemented (verified, no action needed):**
- `app/api/files/[id]/route.ts` — owner-or-staff check, 404-not-403 to avoid existence leak, scan-clean gate, `attachment` + `nosniff` + `sandbox` CSP on download.
- `app/api/upload/route.ts` — auth, MIME allowlist, size cap, staff-only kinds, PRIVATE-to-blob blocked. Storage keys are `kind/year/randomUUID.ext`, server-generated — no path traversal reachable.
- `app/(storefront)/orders/[id]/page.tsx` — `findFirst({ where: { id, userId } })`, correct ownership scoping.
- `app/actions/password-reset.ts` — SHA-256-hashed single-use tokens, 1h TTL, constant response to prevent account enumeration.
- All 16 admin action files carry role guards ≥ exported action count.

### FINDING 1 — Price manipulation via negative cart quantity (HIGH) — ✅ FIXED

`app/actions/cart.ts:6` — `addToCart(productId, quantity, variantLabel)` never validates `quantity`. It is a Server Action, i.e. a directly invocable POST endpoint; the TypeScript default `quantity = 1` is erased at runtime, and `cart.ts` is the only action file with no zod validation. `prisma.schema` declares `quantity Int` with no positivity constraint, and line 20 does `existing.quantity + quantity`.

`app/actions/checkout.ts:52` computes `subtotal = cart.items.reduce((s, i) => s + i.product.priceInr * i.quantity, 0)`. Unit price is read server-side (good — not tamperable), but quantity is attacker-controlled.

Exploit: add the target product at qty 1, then call `addToCart(anyExpensiveProductId, -N)`. The negative line drives `subtotal` down; the attacker tunes N to make `totalInr` any chosen value, and `razorpay.orders.create` is then called with that amount (`checkout.ts:81`). `computeTotals` clamps `totalInr` at `Math.max(0, …)` (`lib/pricing.ts:32`), so it cannot go negative — but a ₹1 charge for a ₹50,000 order is fully achievable, and the order still carries a legitimate +1 line item for the real product.

Fix: validate in `addToCart` — reject non-integer/`< 1` quantity, cap at a sane per-line max, and clamp the merged total: `Math.min(MAX, existing.quantity + quantity)`.

### FINDING 2 — Missing ownership check on cart mutations (MEDIUM) — ✅ FIXED

`app/actions/cart.ts:29` and `:35` — `updateCartItemQty(itemId, qty)` and `removeCartItem(itemId)` mutate by primary key alone:

```ts
await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
await prisma.cartItem.delete({ where: { id: itemId } });
```

Neither resolves the caller's cart first, so any caller can modify or delete *any* cart item given its id — a cross-tenant write. Mitigating factors: ids are cuids (not enumerable) and neither action returns the record, so there is no data disclosure; impact is griefing rather than theft.

Fix: scope to the caller's cart, matching the pattern already used correctly in `orders/[id]/page.tsx`:

```ts
const cart = await getOrCreateCart();
await prisma.cartItem.updateMany({ where: { id: itemId, cartId: cart.id }, data: { quantity } });
```

### FINDING 3 — Auth bypass via Prisma `undefined` filter in mock payment (MEDIUM) — ✅ FIXED

`app/actions/checkout.ts:154` scoped the order lookup with `userId: session?.user?.id ?? undefined`. Prisma **drops** a `where` key whose value is `undefined` rather than matching nothing, so an unauthenticated caller fell through to `where: { id: orderId, paymentStatus: "PENDING" }` — matching *any* user's pending order and marking it PAID via `finalizeOrder`.

Not reachable in configured production (the action throws when `isRazorpayConfigured`, and `startCheckout` blocks the mock path when `NODE_ENV === "production"`), but exploitable unauthenticated in any dev/staging environment without Razorpay keys.

Fixed by requiring a concrete `userId` before the query. A sweep found no other instance of this pattern in `app/` or `lib/`.

## 5. Fixes applied and re-scan (2026-08-11)

Code changes:
- `app/actions/cart.ts` — added `validQty()` integer/`>= 1` validation and a `MAX_QTY = 99` per-line clamp on `addToCart`; scoped `updateCartItemQty` and `removeCartItem` to the caller's cart via `updateMany`/`deleteMany`.
- `app/actions/checkout.ts` — defense-in-depth quantity re-check before the subtotal reduce (protects against rows poisoned before this fix); required a concrete `userId` in `confirmMockPayment`.

Re-scan results — all clean:

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities |
| Deserialization / code-exec sinks | none |
| Raw SQL | none |
| XSS sinks | none |
| Unscoped mutations in `app/actions` | none — all resolve via a `userId`/`cartId`-scoped lookup first |
| Prisma `undefined`-filter pattern | none |
| `tsc --noEmit` | clean |
| `npm test` | 6/6 pass |
| `npm run build` | compiled successfully |

Verified correct during the sweep: `confirmRazorpayPayment` checks the signature *and* scopes by `userId` + `razorpayOrderId` (blocking finalization of a victim order with an attacker-controlled payment); address, notification, and wishlist mutations all resolve through owner-scoped lookups.

## 6. Full re-scan (2026-08-11, second pass)

Re-ran everything above plus classes not covered in the first pass. Findings 1–3 remain fixed; all previous checks still clean (`npm audit` 0, no code-exec/deserialization sinks, no raw SQL, no XSS sinks, no hardcoded secrets).

New classes checked:

| Check | Result |
|---|---|
| SSRF (outbound fetch) | Clean — the only `fetch` is `lib/web3forms.ts:24` to a hardcoded constant `ENDPOINT`; no user-controlled URL |
| Open redirect | Clean — `safeCallbackUrl()` (`lib/nav.ts:11`) rejects non-`/` values and the `//evil.com` + `/\evil.com` protocol-relative bypasses; applied at every `callbackUrl` entry point |
| Exposed credentials | Clean — the Web3Forms key is public by design (ships in client markup) and documented as such |
| Brute-force protection | **FINDING 4** |
| Security response headers | **FINDING 5** |
| Password hashing | bcrypt cost 10 everywhere — acceptable, though 12 is the current recommendation |

### FINDING 4 — No rate limiting on authentication endpoints (MEDIUM) — ✅ FIXED

There is no throttling anywhere in the app: a search for `rateLimit|lockout|failedAttempts|throttle|upstash` across `app/`, `lib/`, `middleware.ts`, and `prisma/schema.prisma` returns nothing, and the schema has no failed-attempt counter.

Consequences, all unauthenticated:
- `lib/auth.ts` Credentials `authorize()` — unlimited password guessing against any known email. Credentials-only auth with no lockout makes password spraying trivially cheap.
- `app/actions/register.ts` — unbounded account creation.
- `app/actions/password-reset.ts:17` — each call sends an email; an attacker can bomb any registered address. The action correctly avoids enumeration, but nothing limits volume.

Server Actions are ordinary POST endpoints, so all three are directly scriptable. Fix: per-IP + per-identifier limits (e.g. Upstash rate limit, or a `failedAttempts`/`lockedUntil` pair on `User` for the login path specifically).

### FINDING 5 — No security response headers (LOW-MEDIUM) — ✅ FIXED

`next.config.ts` contains only a `turbopack.root` pin — no `headers()` block. The app therefore ships without `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, or `Referrer-Policy`. The only headers set anywhere are the correct per-response ones on the file-download route (`app/api/files/[id]/route.ts:59-60`).

Most relevant here: no frame-ancestors control means `/admin` and `/checkout` can be framed for clickjacking, and no HSTS leaves a TLS-downgrade window. Fix: add a `headers()` block in `next.config.ts` covering `/(.*)`.

Neither finding was introduced by the earlier fixes; both are pre-existing gaps in defenses that were never configured.

## 7. Fixes for findings 4–5, and final re-scan (2026-08-11)

### Rate limiting (Finding 4)

Backend chosen: **DB-backed via Prisma**. An in-memory `Map` is unreliable here because Server Actions run across many serverless instances — an attacker would sidestep the limit by spreading requests. Postgres is already a dependency, so this adds no new infrastructure (unlike Upstash/Redis).

- `prisma/schema.prisma` — new `RateLimit` model (`key` PK, `count`, `expiresAt`, indexed on `expiresAt`). Migration `20260810233013_add_rate_limit`, applied.
- `lib/rate-limit.ts` — fixed-window `rateLimit(key, limit, windowMs)`, `resetRateLimit(key)`, `clientIp()`, `retryAfterLabel(sec)`. The counter uses Prisma's atomic `increment`, so concurrent requests can't race past the ceiling. **Fails open**: if the table errors, requests are allowed rather than locking every user out over an infrastructure blip.

Limits applied:

| Path | Key | Limit |
|---|---|---|
| `lib/auth.ts` `authorize()` | per account | 8 failed sign-ins / 15 min |
| `lib/auth.ts` `authorize()` | per IP | 30 failed sign-ins / 15 min |
| `app/actions/register.ts` | per IP | 5 accounts / hour |
| `app/actions/password-reset.ts` request | per email | 3 / hour |
| `app/actions/password-reset.ts` request | per IP | 10 / hour |
| `app/actions/password-reset.ts` submit | per IP | 10 / 15 min |

Two deliberate design points: the login limiter counts **only failed** attempts and clears both windows on success, so a legitimate user is never locked out by their own sign-in; and a throttled login returns `null` — indistinguishable from a wrong password — so probing can't map which accounts exist or are currently locked. The reset-request limiter likewise still returns `{ ok: true }` when throttled, preserving that action's non-enumeration guarantee.

Verified against the live DB: attempts 1–3 allowed and 4–5 blocked at `limit=3`; `resetRateLimit` forgives the window; the window rolls over after expiry.

### Security headers (Finding 5)

`next.config.ts` now serves a `headers()` block on `/:path*` with CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and HSTS (production only — it would pin localhost to https otherwise).

The CSP was scoped against what the app actually loads: `checkout.razorpay.com` and `*.razorpay.com` in `script-src`/`frame-src`/`connect-src` (Razorpay Checkout injects a script and opens its payment iframe — a naive CSP would break payments), plus `api.web3forms.com` in `connect-src`. `next/font/google` self-hosts at build time, so no external font origin is needed. Dev additionally gets `'unsafe-eval'` and `ws:` for Turbopack HMR.

Confirmed by fetching a running production server — all six headers present on the response, not merely configured.

**Known limitation at the time:** `script-src` retained `'unsafe-inline'`. This was subsequently removed — see §8.

### Final re-scan — all clean

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities |
| Deserialization / code-exec sinks | none |
| Raw SQL | none |
| XSS sinks | none |
| Prisma `undefined`-filter pattern | none |
| Unscoped mutations in `app/actions` | none |
| Rate limiting | 6 limits across login, register, reset request, reset submit |
| Security headers | 6 headers verified on a live response |
| `tsc --noEmit` | clean |
| `npm test` | 6/6 pass |
| `npm run build` | compiled successfully |

## 8. Nonce-based CSP — `'unsafe-inline'` removed (2026-08-11)

The last open item from §7. Chosen approach: per-request nonce with `'strict-dynamic'`, accepting the loss of static rendering (the alternative, experimental `experimental.sri`, preserves static generation but is flagged unstable by Next and may change on upgrade).

### `middleware.ts` → `proxy.ts`

The build emitted `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.` — this Next version renamed the convention. `middleware.ts` was removed and replaced with `proxy.ts` (same `auth()` wrapper, default export), which also clears the deprecation warning.

The `matcher` had to widen from 11 gated prefixes to `/((?!api|_next/static|_next/image|favicon.ico).*)` so every HTML response gets a nonce. That widening is dangerous on its own: the old handler's final branch redirected *any* unauthenticated request to `/login`, which under a site-wide matcher would have sent every public page to the login screen. Gating is therefore now scoped explicitly by `PROTECTED_PREFIXES` / `isProtected()`, reproducing the previous matcher's coverage. Prefetch requests are excluded — they render no HTML and need no nonce.

### Forcing dynamic rendering

A prerendered page ships HTML baked at build time whose script tags carry no nonce matching the per-request CSP header — the browser would block **every script on the page**, leaving it rendered but completely inert. Seven statically-generated React routes were therefore switched to `export const dynamic = "force-dynamic"`: `/_not-found`, `/admin`, `/admin/dashboard`, `/admin/login`, `/admin/products/new`, `/admin/reports`, `/dev/emails`.

`/robots.txt` and `/sitemap.xml` remain static deliberately — they are script-free route handlers, so they need no nonce and keep their cacheability.

### Resulting policy

```
script-src 'self' 'nonce-{per-request}' 'strict-dynamic'
```

`'strict-dynamic'` makes the nonce the sole basis of trust: host allowlists in `script-src` are ignored, and a script loaded *by* an already-trusted script inherits trust. This is what keeps Razorpay Checkout working — it is injected at runtime by our own nonced bundle — without naming it in `script-src`.

`style-src` deliberately keeps `'unsafe-inline'`. React renders inline `style` attributes, which CSP governs through `style-src-attr` falling back to `style-src`, so a nonce there would strip inline styling across the UI. Inline styles are a substantially weaker XSS vector than scripts.

CSP moved out of `next.config.ts` (which cannot produce a per-request value) into `proxy.ts`; the five static headers stay in the config.

### Runtime verification

Checked against a running production server, not just the config:

| Check | Result |
|---|---|
| CSP header carries a nonce | PASS |
| All 30 script tags nonced, 0 without | PASS |
| HTML nonce matches header nonce | PASS |
| Nonce differs between two requests | PASS |
| Public pages (`/`, `/shop`, `/about`, `/contact`, `/login`) | all 200 — no redirect regression from the widened matcher |
| `/account`, `/orders`, `/checkout` | 307 → `/login?callbackUrl=…` |
| `/admin`, `/admin/dashboard` | 307 → `/admin/login` |
| `/dealer` | 307 → `/login` |
| Five static security headers | all still present |
| Build | no deprecation warning; only `/robots.txt`, `/sitemap.xml` static |
| `tsc --noEmit` / `npm test` | clean / 6 of 6 |

### Accepted tradeoff

Every HTML page now renders per request. Static optimization, ISR, and CDN edge caching are disabled site-wide, which means slower first loads, more server work, and higher hosting cost. This was chosen deliberately over the experimental SRI alternative.

## 9. Whole-codebase scan (2026-08-11)

Earlier passes covered `vsk-sports` only. This pass widened to every directory under `C:\Users\trite\Documents\website`, closing the scope gap noted in §1.

### vsk-sports — all clean, no regressions

`npm audit` 0 vulnerabilities; no code-exec/deserialization sinks; no raw SQL; no XSS sinks; no hardcoded secrets; no Prisma `undefined`-filter pattern.

One grep pattern flagged three mutations as potentially unscoped — `account.ts:103`, `avatar.ts:19`, `avatar.ts:27`, all `prisma.user.update({ where: { id: userId } })`. **False positives**: `userId` comes from `requireUserId()` (`account.ts:10`), which reads `auth()` and throws when there is no session. These are users updating their own record, scoped by construction.

### Sibling directories

| Directory | Contents | Result |
|---|---|---|
| `vsk-w1-admin` | empty | nothing to scan |
| `audit` | 2 markdown docs | no code |
| `design_handoff_vsk_sports` | 58 static HTML mockups + 3 JS assets | see below |
| `.playwright-mcp` | browser test artifacts (74 logs, 64 yml) | no full credentials captured |

### INFORMATIONAL 1 — Expired Vercel OIDC token in `.env.local`

`vsk-sports/.env.local:2` holds a real `VERCEL_OIDC_TOKEN` (RS256 JWT, project `vsk-sports`, team `t-r-i-t-e-js-projects`).

Not a live exposure: the file is gitignored (`git status --ignored` confirms `!! .env.local`), so it was never committed, and the token **expired 2026-07-04T03:59:23Z** — over a month ago. Vercel issues these with a 12-hour lifetime and regenerates them on `vercel env pull` / `vercel dev`. No action needed; noted only so it isn't mistaken for a committed secret in a future scan.

### INFORMATIONAL 2 — `innerHTML` in design-handoff mockups

The static mockups assign to `innerHTML` in ~20 files (e.g. `Account.html:135`, `Admin-Customers.html:53`), building markup from template literals.

Not a vulnerability as written: every data source is a **hardcoded literal array** in the same file (`ORDERS`, `WISH`, `POSTS`, `C`). The only external input anywhere is `location.hash` at `Account.html:168`, and it flows into `document.querySelector()` and `show()` — which only toggles CSS classes (`Account.html:163-166`) — never into `innerHTML`. These files also live outside `vsk-sports/`, are not in the app's `public/`, and are not part of the Next build, so nothing here is deployed.

Worth keeping in mind only as a porting hazard: this markup pattern becomes an XSS sink the moment it is copied into the real app with server data substituted for the hardcoded arrays. The shipped app currently has zero `innerHTML`/`dangerouslySetInnerHTML` usage — worth keeping it that way.

### Result

No new vulnerabilities. All five original findings remain fixed; the two items above are informational and need no code change.

## 10. Production database wiring + SQL-injection hardening (2026-08-11)

**The app was already on Postgres** (`provider = "postgresql"`, `postgres:16` in docker-compose). The gap was that the only database was a local Docker container on `127.0.0.1:5544`, which Vercel cannot reach — so there was no production database, and several things had to change before one could be attached safely.

### SQL injection

Current state: **zero raw SQL**. No `$queryRaw`, `$executeRaw`, or `*Unsafe` variants anywhere in `app/`, `lib/`, or `prisma/`. All access goes through Prisma's typed client, which parameterises every query — the same reason findings 1–3 were logic bugs rather than injection bugs.

To stop that regressing, `eslint.config.mjs` now bans the unsafe raw methods via `no-restricted-syntax`. The tagged-template forms (`$queryRaw\`...\``) remain allowed because they parameterise interpolated values; only `$queryRawUnsafe` / `$executeRawUnsafe`, which take a concatenated string, are blocked.

Verified by lint-probing a deliberately vulnerable file:

```ts
prisma.$queryRawUnsafe(`SELECT * FROM "User" WHERE email = '${x}'`)
//     ^ error  no-restricted-syntax
```

### Pooling and migrations

`schema.prisma` gained `directUrl`. On serverless, `DATABASE_URL` must be a **pooled** endpoint (each instance opens its own pool, so an unpooled URL exhausts Postgres connections), but `prisma migrate deploy` **cannot run over a transaction-mode pooler** and needs a direct connection. Without both, either runtime or migrations break.

`package.json` build is now `prisma generate && prisma migrate deploy && next build`:
- `prisma generate` — Vercel restores a cached `node_modules`, skipping Prisma's postinstall. Without this the deploy ships a client generated *before* the `RateLimit` model existed, and every `prisma.rateLimit` call throws.
- `prisma migrate deploy` — nothing previously applied migrations, so `add_rate_limit` would never reach production and the Finding 4 protections would fail open silently.

⚠️ **If preview and production share a `DATABASE_URL`, every preview build migrates production.** Confirm they are separate databases, or gate the migrate step on `VERCEL_ENV=production`.

### Destructive seed guard

`prisma/seed.ts` opens with `clear()` — a cascade of `deleteMany()` across every table. Run against production it would erase all orders, customers, and payments. It is now guarded on two independent signals (NODE_ENV, and the host parsed out of `DATABASE_URL`), with an explicit `ALLOW_DESTRUCTIVE_SEED=yes` override. Verified: pointed at a remote host it refuses with a clear message instead of deleting.

### RateLimit cleanup (defect introduced in §7)

The rate limiter wrote one row per (endpoint, account-or-IP) window and only deleted rows early on successful login, so expired rows accumulated without bound — per-IP keys are effectively unlimited in number. Fixed with `app/api/cron/cleanup/route.ts`, scheduled daily at 03:00 by `vercel.json`, pruning `expiresAt < now`.

The endpoint is authenticated with `CRON_SECRET` compared using `crypto.timingSafeEqual`, and **fails closed** — unset secret returns 503 rather than allowing unauthenticated database writes. All four states verified against a running server:

| Request | Result |
|---|---|
| No `Authorization` header | 401 |
| Wrong secret | 401 |
| Correct secret | 200 `{"ok":true,"deleted":0}` |
| `CRON_SECRET` unset entirely | 503 (fails closed) |

### Verification

`prisma validate` valid · `prisma generate` OK · `migrate status` up to date (7 migrations) · `tsc --noEmit` clean · `npm test` 6/6 · `npm run build` compiled successfully.

### Still required before deploying

1. Create the hosted Postgres (Neon recommended — it issues pooled and direct endpoints, matching `url`/`directUrl`).
2. Set in Vercel production: `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `CRON_SECRET`, plus existing `AUTH_SECRET` / `RAZORPAY_*`.
3. `vercel login` (interactive — cannot be automated from here).
4. Preview deploy → browser smoke test of Razorpay checkout and admin under the nonce CSP → promote.

Do **not** run `prisma db seed` against production; it is dev fixture data and the guard will now refuse it.

## Summary

The deserialization query returns clean — no dynamic-execution sinks, and the one attacker-reachable parse is signature-gated with a timing-safe comparison. Dependencies are fully patched (12 → 0). Five findings were identified and all five are fixed: an exploitable price-manipulation bug (HIGH) and a cart IDOR (MEDIUM), both in `app/actions/cart.ts` — the one action file that lacked input validation — an unauthenticated mock-payment bypass (MEDIUM) in `checkout.ts`, absent brute-force protection (MEDIUM), and missing security response headers (LOW-MEDIUM).

Post-fix re-scan is clean across every check, with typecheck, tests, and build all passing. The follow-up hardening step was then completed too (§8): `'unsafe-inline'` is gone from `script-src`, replaced by a per-request nonce with `'strict-dynamic'`, at the cost of site-wide dynamic rendering. No findings remain open.
