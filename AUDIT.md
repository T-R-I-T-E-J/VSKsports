# VSK Sports — Real vs Cosmetic Audit (2026-06-15)

Method: traced every form/flow to whether it calls a server action that **writes to the DB**.
Evidence: 27 `"use server"` files, 23 pages consume their actions, `SubmitForm` confirmed a no-op,
`checkout.ts` read in full.

## Verdict: the app is ~90% real. It is NOT a static prototype.

Everything in the original A–E brief (backend+DB, product mgmt + real images, auth, cart→checkout→orders,
wired admin pages) is **already built and persists to Postgres**. Only a handful of marketing/engagement
forms are still UI-only.

---

## ✅ WORKS — real data + persistence (verified)

| Area | Evidence |
|---|---|
| **Auth** (customer/dealer/admin, bcrypt, JWT sessions, role-gated routes) | NextAuth v5 + middleware; debugged live this session |
| **Products** — admin create/edit/delete + server-side image upload | `products/actions.ts`, `image-actions.ts`; verified uploads today |
| **Cart** — add/update/remove, persisted per user/guest | `actions/cart.ts`, `lib/cart.ts` |
| **Checkout → Order** | `actions/checkout.ts`: creates `Order`+items, Razorpay **or** mock-payment dev mode; signature + ownership verified on confirm; clears cart; emails |
| **Orders** — customer view + admin manage/status | `orders/actions.ts`, admin + storefront order pages |
| **Inventory** (admin, stock adjustments) | `inventory/actions.ts` (wired) |
| **Customers** (admin view/edit) | `customers/actions.ts` (wired on [id]/edit) |
| **Dealers** — application submit + admin approve + dealer bulk-order | `actions/dealer.ts` (wired today), `dealers/actions.ts`, `dealer/actions.ts` |
| **Coupons** (admin CRUD) | `coupons/actions.ts` (wired) |
| **Reviews** — customer write + photos + admin moderation | `actions/reviews.ts`, `reviews/actions.ts` |
| **Returns / RMA** — submit + photos | `actions/returns.ts` |
| **Wishlist / Rewards / Addresses** | `actions/wishlist.ts`, `rewards.ts`, `address.ts` |
| **Blog / Events / Training** — admin CRUD + media | `blog/actions.ts`, `events/actions.ts`, `training/actions.ts` |
| **Media library + avatars** | built this session |

All 22 admin pages read live Prisma data (75 queries). Razorpay degrades to a working mock-payment
flow locally, so checkout works without payment keys.

## ⚠️ COSMETIC — UI only, no persistence (the gaps to finish)

| Item | File | What it does today |
|---|---|---|
| **Contact form** | `(storefront)/contact/page.tsx` | `SubmitForm` no-op — shows "sent", saves nothing |
| **Event registration** | `(storefront)/events/[slug]/page.tsx` | `SubmitForm` — no `EventRegistration` row created |
| **Training registration** | `(storefront)/training/page.tsx` | `SubmitForm` — no `TrainingRegistration` row created |
| **Newsletter signup** | `components/layout/NewsletterForm.tsx` | client `setDone(true)` — no persistence |
| **Admin Settings page** | (missing) | Nav links to `/admin/settings` but no `page.tsx` exists; an orphan `settings/actions.ts` is present → likely 404. Verify. |

Note: `EventRegistration` / `TrainingRegistration` models already exist in the schema — wiring these is a
small action + form change each, not new infrastructure.

## Implication for the decision
Building a fresh Node/Express backend on the raw HTML files would **throw away a nearly-complete, secure,
real app**. The remaining work is ~5 small wirings (4 engagement forms + the Settings page), not a backend
rebuild. Recommended path: finish these on the existing Next.js app.
