# Security Remediation — VSKsports

Source report: `pritampriya222-maker-VSKsports-analysis-report.json` (branch `master`, HEAD `d3f2b75`, 2026-08-11).
Reviewed and remediated: 2026-08-11.

**Scope note that changes how the whole report reads:** the scanner analysed the *committed* `master` tree. The
working tree already carried an unreleased hardening pass (28 modified files) that fixes both HIGH SAST findings and
every SCA advisory. Findings below are marked *at HEAD* (live on the scanned branch) vs *in worktree*.

## Remediation table

| Severity | Finding | File | Confirmed? | Root cause | Fix applied | Verification |
|---|---|---|---|---|---|---|
| HIGH | Negative/non-integer cart quantity reaches order pricing | `app/actions/cart.ts` → `app/actions/checkout.ts:59` | **YES at HEAD** | Server Actions are public POST endpoints; TS types erased at runtime. `addToCart`/`updateCartItemQty` wrote `quantity` straight to the DB; `startCheckout` reduced `price × quantity` into the Razorpay amount | `validQty()` integer≥1 gate + `MAX_QTY` clamp in `cart.ts`; independent re-check at the money path `checkout.ts:55` (worktree, pre-existing) | `vitest` 6/6, `tsc` clean, build OK |
| HIGH | Same rule flagged at `cart/page.tsx:13` | `app/(storefront)/cart/page.tsx:13` | **FALSE POSITIVE** | Read-only render of DB rows already validated at write time | none | — |
| CRITICAL | `next-auth` / `@auth/core` GHSA-7rqj-j65f-68wh, GHSA-8fpg-xm3f-6cx3 | `package.json` | Fixed already | Outdated at HEAD (`next-auth@5.0.0-beta.31`) | worktree pins `5.0.0-beta.32` / `@auth/core 0.41.3` | `npm audit` → 0 vulns |
| HIGH×23 / MED×27 / LOW×3 | next, nodemailer, axios, undici, postcss, sharp, nanoid, js-yaml, brace-expansion | lockfile | Fixed already | stale transitive tree | all installed versions ≥ report's `fixed_version`; `overrides` forces nodemailer 9 under next-auth/@auth/core | `npm audit` → 0 vulns |
| MEDIUM | Shipping method not validated at the trusted boundary | `app/actions/checkout.ts:31` | **YES** (hardening) | `shipping` is an attacker-controlled Server Action arg; `shippingCost()` silently treats any unrecognised value as `standard`, so bad input is absorbed instead of rejected | `SHIPPING_METHODS` allowlist + `parseShipping()`; `startCheckout` throws on anything else and prices from the validated value | build + tests |
| MEDIUM | Mock payment path guarded by config, not by environment | `app/actions/checkout.ts:157` | **YES** (conditional) | `confirmMockPayment` marks an order PAID with a fake id and collects no money. Its only gate was `isRazorpayConfigured` — a config check. If the Razorpay env vars were ever dropped or mis-rotated in prod, a signed-in customer could settle their own PENDING orders for free | hard `NODE_ENV === "production"` block before the config check | `tsc`, tests, build |
| LOW | Cart cookie lacked `Secure` | `lib/cart.ts:31` | **YES** | `vsk_cart` token is the sole binding between visitor and cart; sent over plaintext if any http:// request reaches the origin | `secure: process.env.NODE_ENV === "production"` (off in dev so localhost still works) | build |
| LOW | Seed prints operator-supplied password to stdout | `prisma/seed.ts:565` | **YES** | `SEED_PASSWORD` echoed into CI/deployment logs | only the well-known dev default is printed; a supplied `SEED_PASSWORD` is never echoed | `tsc` clean |
| SECRET ×5 | Dev seed password in `prisma/seed.ts:124` and 4 `scripts/verify-*.mjs` | — | **Not a production credential** | dev fixture for the locally seeded admin | scripts now read `process.env.SEED_PASSWORD` with the dev literal as fallback; prod seeding already fails closed without `SEED_PASSWORD` | `node --check` on all 4 |
| — | 33 SAST "false positives" | various | **All confirmed false positives** (see §6) | scanner rule mismatches | none | — |

## 1. Critical issues

None confirmed in application code. The three CRITICAL entries are SCA advisories against `next-auth`/`@auth/core`,
already resolved by the worktree's `5.0.0-beta.32` / `0.41.3` pins (`npm audit`: 0 vulnerabilities).

## 2. High issues

**Negative order quantity → arbitrary Razorpay charge (CONFIRMED at HEAD).**

Attack path at HEAD: `addToCart` and `updateCartItemQty` are Server Actions — directly invocable POST endpoints, so
the `quantity: number` annotation is erased and unenforced. An attacker POSTs `updateCartItemQty(itemId, -50)`; at
HEAD that wrote `-50` to `CartItem.quantity` (and `removeCartItem`/`updateCartItemQty` used a bare `where: { id }`,
so *any* user's cart line could be edited — an IDOR on top). `startCheckout` then reduced
`product.priceInr * quantity` into `subtotal`, `computeTotals` carried the negative through, and
`razorpay.orders.create({ amount: totalInr * 100 })` charged the attacker-chosen amount. `Math.max(0, …)` in
`computeTotals` clamps only the final total, which turns the attack into a free order rather than blocking it.

Now closed on three independent layers: `validQty()` rejects non-integers and anything < 1 before the DB write;
writes are scoped to the caller's own cart via `updateMany`/`deleteMany`; and `startCheckout` re-validates every
line before pricing, so a row poisoned by any other writer still cannot reach `orders.create`.

The second HIGH (`cart/page.tsx:13`) is the same rule firing on the read side — display only, no write path.

## 3. Medium issues

**Mock payment reachable in production on a config slip** (`app/actions/checkout.ts:157`). Found on the second
review pass, not in the scanner report. `confirmMockPayment` is documented "dev/test only" and sets
`paymentStatus: PAID` with a fabricated `mock_…` payment id. Its only gate was `if (isRazorpayConfigured) throw` —
which inverts safely *while* the keys are present, but fails open the moment they are absent. `startCheckout` has a
matching `NODE_ENV === "production"` guard, so no *new* pending order could be created in that state, but orders
created before the keys went missing remain PENDING and settleable: a signed-in customer POSTs
`confirmMockPayment(<their own orderId>)` and the order flips to PAID/PROCESSING with no money collected. Fixed by
blocking on the environment first, so the config check is defence-in-depth rather than the boundary.

**Shipping method unvalidated at the server boundary** (`app/actions/checkout.ts`) — fixed. Not exploitable for gain
at HEAD (the fallback is the *most* expensive method), but an unvalidated financial input on the money path should
fail closed, not silently coerce.

## 4. Low issues

- Cart cookie `Secure` flag — fixed.
- Seed script logging a supplied password — fixed.
- `uniqueRmaNumber()` uses `Math.random()` (`app/actions/returns.ts:12`) — flagged HIGH by the scanner,
  **not exploitable**: the RMA number is a display label, never an authorization token. Every read of a return is
  gated on `userId`. Left as-is; a predictable label grants nothing.

## 5. Secrets / credentials

All five detections are the **same dev fixture password** for the locally-seeded `admin@vsksports.in`. No value is
reproduced here.

- `prisma/seed.ts:124` — `process.env.SEED_PASSWORD ?? "<dev default>"`, and seeding **already throws** when
  `NODE_ENV=production` and `SEED_PASSWORD` is unset, so the known default cannot reach production.
- `scripts/{test-upload,verify-all,verify-edit,verify-media}.mjs` — all four target `http://localhost:300x` only.
  Now `process.env.SEED_PASSWORD || "<dev default>"`.
- `lib/web3forms.ts:6` — the Web3Forms access key is **public by design** (it ships in client form markup). Not a
  secret. Overridable via `NEXT_PUBLIC_WEB3FORMS_KEY`.
- No `.env` file is tracked by git (`.gitignore: .env*`, `!.env.example`) and `.vercelignore` blocks them from the
  build. No real credential found in source.

**Rotation:** none required — no production credential was exposed. If any environment was ever seeded without
`SEED_PASSWORD`, reset that admin account's password.

## 6. False positives (all 33 verified against source)

| Rule | Sites | Why it is a false positive |
|---|---|---|
| "Dynamic code execution — eval/Function/setTimeout(string)" (4 CRITICAL) | `ResetPasswordForm.tsx:35`, `AddToCartButton.tsx:39`, `ProductDetail.tsx:42`, `RevealOnScroll.tsx:33` | Every one is `setTimeout(() => …, ms)` with an **arrow function**, not a string. No string ever reaches an interpreter. Repo-wide grep: zero `eval(`, `new Function`, or string-form timers. |
| "URL allowlist via String.includes()" (2 CRITICAL) | `FileUpload.tsx:66`, `prisma/seed.ts:199` | Neither site validates a URL. `FileUpload.tsx:66` is `accepted.includes(file.type)` — a MIME allowlist over an exact-match array (and the authoritative check is server-side in `app/api/upload/route.ts:48`). `seed.ts:199` is `Map.set` on a product name. No redirect anywhere. |
| "Quantity used in price calc" (11 HIGH) | `checkout/page.tsx:24,28`, `orders/[id]:123`, `returns/page:162`, `dashboard:103,132`, `admin/orders/[id]:85`, `reports:65,83`, `CartRow.tsx:55`, `templates.ts:127`, `dealer/actions.ts:56` | All render or aggregate quantities **already persisted** after server-side validation. `dealer/actions.ts:41` independently enforces `Number.isFinite && > 0` plus a DEALER/ADMIN/STAFF role check before any pricing. |
| "CSP header built with user input" (8 MEDIUM) | `pricing.ts:3`, `storage.ts:74`, `checkout.ts:19`, `password-reset.ts:37`, `returns.ts:12`, `dealers/actions.ts:20`, `dashboard:87`, `FileUpload.tsx:61` | None of these set a header. The only CSP in the codebase is `proxy.ts:46`, built from a server-generated `crypto.randomUUID()` nonce with `strict-dynamic` — no user input. |
| "Math.random() for security" (1 HIGH) | `returns.ts:16` | Generates a display-only RMA label; authorization is by `userId`, never by RMA number. Security-sensitive tokens correctly use `crypto.randomBytes(32)` (`password-reset.ts:47`). |
| "iframe srcDoc without sandbox" (1 MEDIUM) | `dev/emails/page.tsx:63` | The page calls `notFound()` when `NODE_ENV === "production"`, and the HTML is built entirely from hardcoded sample objects. No user input, not reachable in prod. |
| "EXIF/metadata exposure" (1 MEDIUM) | `lib/storage.ts:53` | Inverted: this line *reads* metadata from the sharp-re-encoded buffer to record width/height. Re-encoding **strips** EXIF — this is the mitigation, not the leak. |
| "Sensitive data in logs" (2 LOW) | `password-reset.ts:40`, `seed.ts:532` | `password-reset.ts:40` logs only an error object from a failed send (no token — the token lives in `resetUrl`, which is not logged). `seed.ts` was a genuine papercut and is now fixed (§4). |

## 7. Dependency upgrades

No upgrade was needed at remediation time — the worktree tree already satisfies every advisory:

| Package | Installed | Report's fixed version |
|---|---|---|
| next | 16.3.0 | 16.2.11 |
| next-auth | 5.0.0-beta.32 | 5.0.0-beta.32 |
| @auth/core | 0.41.3 | 0.41.3 |
| nodemailer | 9.0.5 | 9.0.1 |
| axios | 1.19.0 | 1.18.0 |
| undici | 6.28.0 | 6.28.0 |
| postcss | 8.5.26 (8.5.23 under next) | 8.5.23 |
| sharp | 0.35.3 | 0.35.0 |
| nanoid | 3.3.18 | 3.3.17 |
| js-yaml | 4.3.1 | 4.3.1 |
| brace-expansion | 1.1.18 / 5.0.9 | 1.1.18 / 5.0.9 |

`npm audit` and `npm audit --omit=dev`: **0 vulnerabilities**. The nodemailer major bump (7→9) is covered by
`overrides` forcing `next-auth` and `@auth/core` onto the same version; build and tests pass.

## 8. Tests / build results

| Check | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | pass, 0 errors |
| Lint | `npm run lint` | 8 errors, 2 warnings — **all pre-existing**, all in files untouched here (`_lib/charts.tsx`, three admin pages, `I18nProvider.tsx`, `CookieBanner.tsx`, `seed.ts:17-18` `any`). Zero in `checkout.ts`, `cart.ts`, `scripts/`. |
| Tests | `npx vitest run` | 6/6 passing (1 file) |
| Build | `npx prisma generate && npx next build` | success. `npm run build` also runs `prisma migrate deploy`, skipped here — no database on this host. |
| Audit | `npm audit` | 0 vulnerabilities |
| Scripts | `node --check` ×4 | all parse |

## 9. Remaining risks

1. **The fixes are uncommitted.** Everything above lives in the working tree; `master` still carries the exploitable
   negative-quantity path. Commit and deploy before this is considered closed.
2. **Shipping method is not persisted on `Order`.** The schema stores `shippingInr` but no method field. A customer
   can legitimately select "Store Pickup" (₹0 shipping) and fulfilment has no record that pickup was chosen. Worth
   a `shippingMethod` column; deliberately not done here (schema migration, beyond a security fix).
3. **Rate limiting fails open** (`lib/rate-limit.ts:68`). A deliberate availability trade-off, but a DB outage
   removes brute-force protection on login, registration and password reset simultaneously.
4. **`clientIp()` trusts `x-forwarded-for`** (`lib/rate-limit.ts:25`). Safe behind Vercel's proxy, which overwrites
   it; if this ever runs behind a different edge, per-IP limits become spoofable.
5. **Document scanning is a stub** (`app/api/upload/route.ts:63` hardcodes `scanStatus = "clean"`). Uploaded
   dealer/order PDFs are never malware-scanned. Downloads are served `attachment` + `nosniff` + `sandbox`, so they
   cannot execute on the origin, but the bytes are still handed to whoever downloads them.
6. **`.env` and `.env.local` exist on this host** and are correctly git-ignored and vercel-ignored. Their contents
   were not read or inspected; standard local-machine hygiene applies.
7. **Not verified:** the report's `scan_summary` lists no included/excluded file lists, so I cannot confirm the
   scanner covered `middleware`/`proxy.ts`. Reviewed manually here regardless.
8. **`trustHost: true`** (`auth.config.ts:6`) makes Auth.js build callback URLs from the request `Host` header. Safe
   behind Vercel's host-based routing, which only delivers requests for attached domains; would become a phishing
   vector if this app were ever fronted by a proxy that forwards arbitrary `Host` values.

## Appendix — second-pass audit (independent of the scanner)

Re-verified after the first remediation round; recorded so the coverage is auditable.

- **Authorization, every Server Action.** All 45 exported actions across 17 `*actions.ts` files plus `app/actions/*`
  were checked individually (not by file-level grep, which `requireUserId()` would have hidden). Every admin action
  calls `requireStaff()` (`_lib/admin.ts:5`, throws unless ADMIN/STAFF); every customer action resolves the actor
  from the session and scopes its query by `userId`. No unguarded mutation found. `logout` (session-only) and
  `cart.ts` (cookie-scoped, anonymous by design) are the sole exceptions, both correct.
- **IDOR spot-checks.** `setDefaultAddress`, `deleteAddress`, `createReturn`, `confirmRazorpayPayment` and
  `app/api/files/[id]` all re-fetch the target with the owner id in the `where` clause before acting. `file.key` in
  the download route is a server-generated UUID path from the DB, never client input — no traversal reachable.
- **`changePassword`** (`account.ts`) verifies the current password with `bcrypt.compare` before rehashing.
- **Open redirect.** `safeCallbackUrl` (`lib/nav.ts:11`) rejects non-strings, absolute URLs, `//host` and `/\host`.
  It is applied at every `callbackUrl` entry point (`login/page.tsx:15`, `register/page.tsx:15`, both forms).
- **Remaining false-positive sites opened verbatim** rather than inferred: `dashboard/page.tsx:87` is a
  `${year}-${month}` chart bucket key; `:103`/`:132` and `reports:83` are revenue aggregations over persisted
  `OrderItem` rows; `checkout/page.tsx:28` is a display mapping; `FileUpload.tsx:66` is `accepted.includes(file.type)`
  over an exact-match MIME array. None involves a header, a redirect, or a write.
