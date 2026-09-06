# Operations Runbook

Everything an on-call engineer needs when something is wrong at 2am. Written to
be followed by someone who did not build this system.

---

## 1. Is it broken?

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<host>/api/health
```

| Code | Meaning |
| --- | --- |
| `200` | Database reachable AND every subsystem configured. |
| `503` | Degraded. Something is wrong — get the detail below. |
| timeout / `5xx` from the platform | The app itself is down, not just unhealthy. |

The public response deliberately carries **no detail**. Telling an anonymous
caller "email: not configured" tells an attacker password reset is silently
broken. To see which subsystem failed:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/health | jq
```

That returns a `checks` array naming `database`, `payments`, `email`, `storage`
and `auth`, plus `latencyMs`. It never echoes a secret value.

---

## 2. Alerts

The app has no monitoring vendor wired in. It emits structured lines to stdout
with a stable prefix so a log drain can match them:

```
[ALERT] {"event":"order.oversold","at":"...","orderId":"..."}
```

Set up **one** log-drain rule: match the literal string `[ALERT]` and route it
to whatever you actually read (email, Slack, PagerDuty). Until that exists,
these events are written and never seen by anyone.

| Event | Means | Do this |
| --- | --- | --- |
| `payment.amount_mismatch` | The gateway reports a different amount than the order. | **Stop and investigate.** Possible tampering. Do not settle manually. |
| `payment.possible_double_charge` | Two payments resolved to one order. | Check Razorpay dashboard; refund the duplicate. |
| `payment.unresolvable_order` | A webhook arrived for an order we cannot find. | Check `razorpayOrderId` against the orders table. |
| `payment.settlement_failed` | Payment took, order did not settle. | Customer has paid and has no order. Highest urgency. |
| `order.oversold` | Stock went below what was sold. | Contact the customer before they find out. |
| `email.delivery_failed` | SMTP rejected a message. | Check SMTP credentials; the order is fine. |
| `order.reconciled` | The cron rescued a stranded order. | Informational. A burst means webhooks are not arriving. |
| `client.render_failed` | A page crashed in the customer's browser. | Reproduce the `path` in the payload. A spike after a deploy means roll back. |

---

## 3. Backups

> **Untested backups are not backups.** Restore-test on a schedule. A backup you
> have never restored is a belief, not a capability.

### If you are on Neon

Neon keeps continuous history; point-in-time restore is a branch operation.
Confirm in the console that history retention is **long enough to notice a
problem** — the default is short, and a corruption discovered on Monday is
useless if retention ended on Sunday. Set it to at least 7 days.

### Manual dump

`DIRECT_URL` (not the pooled `DATABASE_URL`) is the right connection for dumps:

```bash
pg_dump "$DIRECT_URL" --format=custom --no-owner --no-acl \
  --file="vsk-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

### Restore drill — do this quarterly, not during an incident

```bash
createdb vsk_restore_test
pg_restore --dbname=vsk_restore_test --no-owner --no-acl vsk-<timestamp>.dump

# Prove it actually came back:
psql vsk_restore_test -c 'SELECT count(*) FROM "Order";'
psql vsk_restore_test -c 'SELECT count(*) FROM "Product";'
psql vsk_restore_test -c 'SELECT count(*) FROM "User";'

dropdb vsk_restore_test
```

Record the row counts and the wall-clock time it took. **Time-to-restore is the
number that matters during an outage**, and you only learn it by measuring.

---

## 4. Stranded orders

A customer pays, the webhook never arrives, and the order sits `PENDING`. The
reconcile cron fixes this:

```
GET /api/cron/reconcile-orders
Authorization: Bearer $CRON_SECRET
```

It only touches orders between **30 minutes and 7 days** old, in batches of 50,
and settles through the same idempotent path as the webhook — running it twice
is safe. Without `CRON_SECRET` set it fails closed and does nothing.

Schedule it every 15 minutes. If it reconciles orders regularly, the webhook
registration is wrong — fix that rather than relying on the cron.

---

## 5. Locking out a compromised account

Sessions are stateless JWTs, so deleting a session row is not a thing. Instead
stamp the user's `sessionsValidFrom`; every token issued before that instant is
rejected on the next request:

```sql
UPDATE "User" SET "sessionsValidFrom" = NOW() WHERE email = 'someone@example.com';
```

Changing a role takes effect the same way — `getValidatedSession()` re-reads the
role from the database rather than trusting the token.

---

## 6. Pricing and tax

GST and delivery rates are **not in the code**. They live in `Setting` rows and
are edited at `/admin/settings`. Changing them affects new orders only; past
orders keep the amounts they were charged, and invoices show the rate that was
in force at the time.

If a rate is wrong, an admin fixes it in the UI. No deploy, no engineer.

---

## 7. Deploying

CI (`.github/workflows/ci.yml`) must be green. It runs migrations from an empty
database, asserts zero schema drift, checks every foreign key is indexed,
typechecks, lints, tests against real Postgres, and builds.

```bash
npx prisma migrate deploy   # uses DIRECT_URL
```

Migrations are additive; none of them drop a column or a table. Before running
one against production for the first time, check the CHECK constraints will not
reject existing rows:

```bash
DATABASE_URL="$PRODUCTION_URL" node scripts/check-data-constraints.mjs
```

It exits non-zero and names the offending constraint if any row violates one.
CI runs the same script against a fresh database, which proves the constraints
are *satisfiable* but not that your production data satisfies them — only
running it against production tells you that.

---

## 8. Required environment variables

Names copied from source, not inferred. See `lib/config.ts`.

| Variable | Used by | Without it |
| --- | --- | --- |
| `DATABASE_URL` | everything | Nothing works. |
| `DIRECT_URL` | `prisma migrate` | Migrations fail on a pooled connection. |
| `AUTH_SECRET` | NextAuth | Sessions cannot be signed. |
| `NEXTAUTH_URL` / `AUTH_URL` | NextAuth | Callback URLs are wrong. |
| `RAZORPAY_KEY_ID` | checkout | Checkout refuses to start. |
| `RAZORPAY_KEY_SECRET` | checkout | As above. |
| `RAZORPAY_WEBHOOK_SECRET` | webhook | Signatures cannot be verified. |
| `SMTP_HOST` | email | Email throws in production. |
| `SMTP_FROM` *or* `SMTP_USER` | email | No sender address. |
| `STORAGE_DRIVER` | uploads | Defaults to `local`, which is **ephemeral on serverless** — uploads vanish. Set to `blob` in production. |
| `BLOB_READ_WRITE_TOKEN` | uploads | Required when `STORAGE_DRIVER=blob`. |
| `CRON_SECRET` | reconcile cron, health detail | Cron fails closed; health detail unavailable. |

`/api/health` returns 503 while any of these is missing, so a monitor catches a
misconfigured deploy without anyone reading a checklist.
