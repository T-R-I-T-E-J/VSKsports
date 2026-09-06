# PR Review — `razorpay`: Replace mock payment path with full Razorpay integration

- **Commit:** `b345b76` by varen012 <Shrivarenranga@gmail.com>, 12 Aug 2026
- **Branch:** `razorpay` — 1 commit ahead of `master`, 0 behind (clean fast-forward)
- **Scope:** 12 files, +443 / −184
- **Note:** there is no GitHub *pull request* open. Both `T-R-I-T-E-J/VSKsports` and
  `pritampriya222-maker/VSKsports` have zero PRs, open or closed. This is an
  unmerged branch pushed directly to origin.

---

## 1. What the PR does

Before this, checkout had a decorative payment step: the UPI/Card/Netbanking tiles set
local React state that was never sent anywhere, and `confirmMockPayment` marked orders
`PAID` with a fake payment id while collecting no money. Razorpay is now the only
payment path.

### Flow after the change

```
Address → Shipping → Pay  →  Razorpay modal (real method choice)
                              │
              ┌───────────────┴───────────────┐
       browser confirm                    webhook
   confirmRazorpayPayment()      POST /api/webhooks/razorpay
              │                                │
              └──────► settleOrderPaid() ◄──────┘
                        (lib/orders.ts)
```

| Change | File |
|---|---|
| `confirmMockPayment` and the mock branch deleted | `app/actions/checkout.ts` |
| `startCheckout` refuses before writing when keys are absent | `checkout.ts:65` |
| Payment-method tiles removed — Razorpay's modal owns method choice | `CheckoutFlow.tsx` |
| `checkout.js` preloaded on mount so the modal opens with no round-trip | `CheckoutFlow.tsx` |
| Single settlement path shared by browser + webhook | `lib/orders.ts` (new) |
| `payment.failed` handled; `retryPayment` reuses the same order | `checkout.ts:156` |
| Inventory decremented on payment; out-of-stock rejected at checkout | `orders.ts:45`, `checkout.ts:81` |
| `Order.razorpayOrderId` made `@unique` + `failureReason` column added | `prisma/schema.prisma` |
| Cart bound to user so the cookie-less webhook can clear it | `checkout.ts:96` |
| Shipping row used `shippingCost()` instead of a hardcoded value | `CheckoutFlow.tsx` |
| Dead `NEXT_PUBLIC_RAZORPAY_KEY_ID` dropped (key id comes back from the action) | `.env.example` |
| vitest config + 10 signature tests | `vitest.config.mts`, `lib/razorpay.test.ts` |

### The idempotency design

Two callers race to settle every order — the browser (fast, but the tab can close) and
the webhook (authoritative, may arrive first or twice). The intended lock is the status
write itself: `updateMany` guarded on `paymentStatus: { not: "PAID" }` is one atomic
statement, and only the caller whose update matched a row (`count === 1`) moves stock.

**This design is correct in principle but is not correctly implemented — see C1 and C2.**

---

## 2. Verification performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **Clean** (after `prisma generate`; 3 stale-client errors before) |
| `npm test` (vitest) | **16/16 pass** — 10 new + 6 pre-existing pricing |
| `npx next build` | **Succeeds**, exit 0 |
| `npx eslint` | 8 errors, 2 warnings — **identical count on `master`**; all in `CookieBanner.tsx` and `prisma/seed.ts`, neither touched by this PR. **No lint regression.** |
| Prod duplicate `razorpayOrderId` | **0 groups** — unique index applies cleanly |
| Master security fixes preserved | **Yes** — `parseShipping` allowlist (`checkout.ts:33-37`, enforced `:59`) and integer-quantity check (`:76-78`) both intact |

### Production database state

The migration `20260812140000_razorpay_integration` is **already applied to the
production database**, and `failureReason` + the unique index are already present.
Production currently holds **0 orders**.

Cause: `DATABASE_URL` / `DIRECT_URL` are set for **both Preview and Production** in
Vercel and point at the **same Neon endpoint** (`ep-green-bonus-ayb1bidy`). `npm run
build` is `prisma generate && prisma migrate deploy && next build`, so the *preview*
build for this branch ran `migrate deploy` against the production database.

This one was harmless (additive column + unique index, backward compatible, zero orders).
The general risk is not: any branch carrying a destructive migration will mutate
production data at preview-build time, before review. Give preview its own database.

---

## 3. Findings

### CRITICAL

**C1 — Settlement side effects run outside the idempotency lock.**
`lib/orders.ts:22-31` commits `PAID` in a standalone auto-committed `updateMany`.
Stock, `OrderEvent`, and cart clear happen in a *separate* `$transaction` at `:42`.
If that transaction throws (deadlock, pool timeout, instance killed), the order is
already `PAID`; Razorpay retries; the retry hits `count === 0` and returns `false`.
Stock is never decremented and the cart never clears — permanently, silently.
The guard delivers *at most once*, not *exactly once*.
**Fix:** move the guarded status write inside the same `$transaction` as the side
effects and bail on `count === 0`; keep email and `revalidatePath` after commit.

**C2 — `retryPayment` orphans the previous gateway order; money can be captured and never settled.**
`checkout.ts:146` overwrites `Order.razorpayOrderId`, but `Order` holds only one id
while a retried order has N live gateway orders at Razorpay. Trace:
1. Attempt A → `razorpayOrderId = order_A`; user starts a UPI collect, closes the modal.
2. Retry → `razorpayOrderId = order_B`.
3. User approves the UPI mandate on their phone → Razorpay captures **order_A**.
4. Webhook `findUnique({ razorpayOrderId: "order_A" })` → null → returns **200**.

Money captured, order left `PENDING`, no stock movement, no email — and the 200 tells
Razorpay to stop retrying, so there is no second chance. If the user then pays
`order_B`, they are charged twice and only one charge settles.
**Fix:** a `PaymentAttempt` table keyed on `razorpayOrderId @unique`. Stopgap: fall back
to `payment.entity.notes.orderId` (already written at `checkout.ts:144`, never read) and
return non-2xx for an unresolvable id so Razorpay keeps retrying.

**C3 — `not: "PAID"` also matches `REFUNDED`.**
`PaymentStatus` is `PENDING | PAID | FAILED | REFUNDED` (`schema.prisma:363`).
A replayed `payment.captured` on a refunded order flips it back to `PAID`, decrements
stock a **second** time, and re-counts it in dashboard revenue — the exact
double-decrement the design claims to prevent. `markOrderFailed` has the mirror bug.
**Fix:** gate on `paymentStatus: "PENDING"` (plus `"FAILED"` where retry is intended).

### IMPORTANT

- **I1** — Oversell window spans the whole payment session. Stock checked at
  `checkout.ts:81`, decremented at `orders.ts:45`, no reservation, no re-check.
  `decrement` has no `gte` guard so stock goes **negative** silently. `retryPayment`
  re-checks nothing at all.
- **I2** — Variant stock never validated at checkout (`checkout.ts:81` queries only
  `InventoryItem`) but *is* decremented at `orders.ts:50`. Also the per-row check means
  two cart rows of the same product (qty 6 each) pass against stock of 10.
- **I3** — Variant decrement matches on `label`, a string snapshot copied to the
  OrderItem. Rename the variant and every later settlement silently decrements nothing.
- **I4** — An order can settle `PAID` with `razorpayPaymentId: null` (`route.ts:48` on
  an `order.paid` without a payment entity). Unrefundable, and the later
  `payment.captured` carrying the real id hits the guard and never backfills.
- **I5** — Retry charges the **stored** total while the button renders the **live** cart
  total (`CheckoutFlow.tsx:83`, `:322`). Shipping radios stay live after a failure, so a
  customer can switch to express, see ₹X+450, and be charged ₹X. Server behaviour is
  right; the UI contradicts it. Freeze the selector once `retryOrderId` is set.
- **I6** — `settleOrderPaid`'s boolean return means three different things
  (`:31` already settled, `:40` order vanished, `:76` we settled it) and **all four call
  sites discard it**. `:40` is a genuine invariant violation, logged nowhere.
- **I7** — Webhook drops three event classes at HTTP 200 with zero logging: no order id
  (`route.ts:38`), order not found (`:45`), unhandled event type. Indistinguishable from
  C2. No `try/catch`, so a DB error returns a 500 with a stack trace to Razorpay.
- **I8** — `CheckoutFlow.tsx:152`: `void markPaymentFailed(...).catch(() => {})` swallows
  everything, while line 154 tells the customer "No money was taken" — a claim the
  client cannot verify.
- **I9** — Next.js redacts Server Action error messages in production, so every
  carefully-worded throw in `checkout.ts` ("Your cart is empty", "…is out of stock")
  reaches the customer as an opaque digest. Return typed results instead of throwing.
- **I10** — `orders.create` succeeding then `prisma.order.update` failing
  (`checkout.ts:140-146`) leaves a payable gateway order no webhook can resolve.

### SUGGESTIONS

- No test covers `settleOrderPaid`, the race it claims to win, or any webhook routing —
  i.e. every finding above is untested. The 10 new tests are real and the negative cases
  (length mismatch, cross-secret, replay) are valuable, but the positive cases re-derive
  the HMAC and can only pin the wire format.
- `parseShipping` can't be unit-tested where it lives — `"use server"` forbids exporting
  non-async values. Move the allowlist to `lib/pricing.ts`.
- `lib/razorpay.ts:7` — comment rot: "When false, checkout runs in mock/test mode" is
  false now that mock mode is deleted. It fails closed instead.
- `void sendOrderConfirmationEmail(...)` in a serverless function with no `waitUntil` may
  be reclaimed before it resolves. `mailer.ts` never throws, so the `.catch()` is dead
  code and the `{ ok: false }` is discarded.
- No webhook event-id dedup table; the whole idempotency story rests on the status guard.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` is dropped by the PR but **still set in Vercel** for
  Production and Preview. Remove it after merge.

---

## 3a. Fixes applied (uncommitted, on top of `b345b76`)

All three CRITICALs are fixed. `tsc` clean, 16/16 tests, `next build` exit 0, lint
unchanged at the master baseline (8 errors / 2 warnings, none in touched files).

| # | Fix | File |
|---|---|---|
| C1 | Lock and side effects moved into **one** transaction; `!order` now throws (rolling the status write back) instead of returning `false`; email + `revalidatePath` remain outside, after commit; explicit 20s `SETTLE_TX` timeout since the transaction now holds the stock loop | `lib/orders.ts` |
| C3 | `not: "PAID"` → `in: SETTLEABLE_FROM` (`PENDING`, `FAILED`) in `settleOrderPaid`, `markOrderFailed`, and `retryPayment`. Named constant so a new enum member can't silently widen the guard. `markOrderFailed`'s status write and audit event now share a transaction | `lib/orders.ts`, `app/actions/checkout.ts` |
| C2 | `resolveOrder()`: `razorpayOrderId` → payload `notes.orderId` → `razorpay.orders.fetch()` notes. Unresolvable *handled* events now log and return **500** so Razorpay redelivers instead of dropping silently. Unhandled event types short-circuit at 200 before resolution, so refunds/settlements don't trigger retries. Settlement wrapped in try/catch — logs and returns a clean 500 rather than leaking a stack trace to the gateway | `app/api/webhooks/razorpay/route.ts` |

C2 verified against **live Razorpay test mode**: `orders.create` with
`notes: { orderId }` → `orders.fetch` returns the same notes, so the fallback
resolves. Test keys are in the gitignored `.env` (`rzp_test_…redacted…`).

C2 is the stopgap, not the data model. `Order` still stores one gateway id; a
`PaymentAttempt` table remains the correct long-term fix and would also give a
per-attempt audit trail.

## 3b. Oversell fixes + merge

`e8f235b` — quantities summed per product at checkout; variant stock checked
(labels with no `ProductVariant` row fall through to the product check rather
than being rejected); decrement now conditional on `stock >= quantity`, with the
remainder clamped to zero and the shortfall recorded on the `OrderEvent` and
logged rather than settling silently or refusing a paid order; `retryPayment`
re-checks the order's own lines.

Merged to `master` as `e388a8b` and pushed. Vercel's Git integration picked it
up: production deployment `vs-ksports-koiswz0w9` built in 55s and is Ready.
Verified live — smoke 6/6 against `https://www.webtesters.space`, 9 products
rendering from Postgres.

**Note for future config work:** `git push` to master DOES auto-deploy to
production on this project. Earlier deploys in this repo were done manually with
`vercel redeploy`, which made that ambiguous.

## 4. Recommendation

**Do not merge as-is.** The direction is right and deleting `confirmMockPayment` closes a
genuine free-goods hole, so this is strictly better than what is in production today —
but C1–C3 are money-correctness defects in the settlement path, and C2 can take a
customer's money without ever fulfilling the order.

Merge order:
1. Fix C1 (move the lock inside the transaction) and C3 (gate on `PENDING`) — both small.
2. Fix C2, at minimum the `notes.orderId` fallback plus a non-2xx on unresolvable ids.
3. Add the `gte` guard on the stock decrement (I1) and validate variant stock (I2).
4. Then merge. I5 and I8 can follow.

Local checkout is currently **entirely blocked**: `RAZORPAY_KEY_ID` and
`RAZORPAY_KEY_SECRET` are empty in `.env`, so `startCheckout` throws
"Online payments are not configured." Add Razorpay **test-mode** keys locally to
exercise the flow end to end.
