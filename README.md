# Ledgerline — Stripe-like payments dashboard (reference implementation)

> A reference implementation inspired by **Stripe**. Not affiliated with or endorsed by Stripe.
> Every charge, refund, payout and webhook is **simulated locally** — see [Simulation boundary](#simulation-boundary).

Ledgerline is a working payments workspace: customers, card tokens, products and prices,
subscriptions, checkout sessions, invoices, refunds, disputes, a balance ledger, payouts,
API keys, signed webhooks and a dashboard with MRR and a revenue chart. Money is always
stored and computed as **integer minor units** (cents).

## Stack

Next.js 16.4.6 (App Router, Turbopack), React 19, Tailwind CSS 4, TypeScript,
MongoDB + Mongoose, bcryptjs, `jose` JWT in an HTTP-only cookie, and zod.

## Quick start

Requirements: Node 20.9+, npm, MongoDB running locally.

```bash
npm install
cp .env.example .env.local   # already provided in this reference
npm run seed                 # wipes ONLY the stripe_ref database and reloads demo data
npm run dev                  # http://localhost:3000
```

For the production build used in verification:

```bash
npm run build && npm start -- -p 3221
```

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/stripe_ref` | MongoDB connection (the app forces DB name `stripe_ref` in the seed) |
| `JWT_SECRET` | dev-only value | HS256 secret for the session cookie |
| `WEBHOOK_SECRET` | `whsec_local_reference_secret_3221` | HMAC secret for `x-ledgerline-signature` |
| `PAYMENT_ADAPTER` | `local` | Resolves the gateway implementation in `lib/payments/adapter.ts` |

### Demo accounts

All passwords are `password123`.

| Email | Role |
| --- | --- |
| `owner@ledgerline.dev` | owner |
| `admin@ledgerline.dev` | member |
| `member@ledgerline.dev` | member |

Seeded API keys (full values are shown by `npm run seed`; only SHA-256 hashes are stored):

| Scope | Token |
| --- | --- |
| admin | `ll_admin_a1b2c3d4e5f60718293a4b5c6d7e8f90` |
| write | `ll_write_b2c3d4e5f60718293a4b5c6d7e8f90a1` |
| read | `ll_read_c3d4e5f60718293a4b5c6d7e8f90a1b2` |

`GET /api/admin/metrics` accepts only the admin key as `Authorization: Bearer <token>`;
read/write keys receive `403`, invalid or missing keys receive `401`.

## Features

- **Workspace auth** — register, login, logout, `/api/auth/me`; HTTP-only signed JWT cookie; guarded route group.
- **Customers** — CRUD, search by name/email/ID, balance, nested payment method management.
- **Payment methods** — simulated card tokens with brand/last4/expiry, default selection, attach/remove.
- **Catalog** — products and prices; one-time, monthly and yearly intervals; archive flows.
- **Subscriptions** — `trialing`, `active`, `past_due`, `canceled`; cancel at period end; cycle generation; retry payment.
- **Checkout** — hosted session pages, simulated success/failure, invoice + ledger creation on success.
- **Invoices** — generated per cycle, line items, integer tax allocation, printable HTML view, pay/failure flows.
- **Refunds and disputes** — charge-aware refund limits, statuses and dispute resolution.
- **Balance ledger** — atomic running balance, fee entries, transaction filters.
- **Payouts** — availability checks, pending/paid/failed, ledger debit on payment.
- **API keys** — masked values, one-time display, SHA-256 hashes, read/write/admin scopes, revocation.
- **Webhooks** — HMAC signature verification, replay window, persistence, idempotent handling and a delivery log.
- **Dashboard** — MRR, six-month SVG revenue chart, subscription mix, recent ledger activity and webhook log.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account (409 on duplicate email) |
| POST | `/api/auth/login` | Sign in, set session cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current user or `null` |
| GET / POST | `/api/customers` | List (search/sort/page) / create |
| GET / PATCH / DELETE | `/api/customers/[id]` | Read / update / delete (409 if active subscriptions) |
| GET | `/api/customers/[id]/payment-methods` | Cards for a customer |
| GET / POST | `/api/payment-methods` | List (filter by `customer`) / tokenize |
| PATCH / DELETE | `/api/payment-methods/[id]` | Set default / remove |
| GET / POST | `/api/products` | List / create |
| GET / PATCH / DELETE | `/api/products/[id]` | Read / update / archive |
| GET / POST | `/api/prices` | List (filter by product) / create |
| GET / PATCH | `/api/prices/[id]` | Read / update (archive or change amount) |
| GET / POST | `/api/subscriptions` | List (status filter) / create |
| GET | `/api/subscriptions/[id]` | Read |
| POST | `/api/subscriptions/[id]/cancel` | Cancel at period end or immediately |
| POST | `/api/subscriptions/[id]/cycle` | Advance cycle, generate invoice, apply cancellation |
| POST | `/api/subscriptions/[id]/payment` | Simulated success/failure → active/past_due |
| GET / POST | `/api/checkout/sessions` | List / create |
| GET | `/api/checkout/sessions/[id]` | Read |
| POST | `/api/checkout/sessions/[id]/complete` | Simulated completion |
| GET / POST | `/api/invoices` | List / create ad-hoc invoice with line items and tax |
| GET | `/api/invoices/[id]` | Read |
| POST | `/api/invoices/[id]/pay` | Simulated payment |
| GET | `/api/invoices/[id]/html` | Printable HTML invoice |
| GET / POST | `/api/refunds` | List / issue refund |
| GET | `/api/refunds/[id]` | Read |
| GET / POST | `/api/disputes` | List / open dispute |
| PATCH | `/api/disputes/[id]` | Update status/evidence |
| GET | `/api/balance` | Available balance, breakdown, recent entries |
| GET | `/api/balance/transactions` | Ledger list (kind filter, paging) |
| GET / POST | `/api/payouts` | List / schedule payout |
| POST | `/api/payouts/[id]/pay` | Mark paid and debit ledger |
| GET / POST | `/api/api-keys` | List masked keys / create key |
| DELETE | `/api/api-keys/[id]` | Revoke key |
| GET | `/api/admin/metrics` | Admin-scoped metrics |
| POST | `/api/webhooks/stripe` | Signed, idempotent webhook receiver |
| GET | `/api/webhooks/events` | Webhook delivery log |

All list endpoints clamp `limit` to 1–100 and `page` to 1–10000.

### Signed webhook example

```bash
BODY='{"id":"evt_cli_1","type":"invoice.paid","data":{"id":"in_002"}}'
TS=$(date +%s)
SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac 'whsec_local_reference_secret_3221' -hex | awk '{print $NF}')
curl -X POST http://127.0.0.1:3221/api/webhooks/stripe \
  -H 'Content-Type: application/json' \
  -H "x-ledgerline-signature: t=$TS,v1=$SIG" \
  --data-raw "$BODY"
```

Sending the same body again returns `{"duplicate":true,...}` with no repeated effects.

## Plan (Step 0 record)

**Models (15):** User, Counter, Customer, PaymentMethod, Product, Price, Subscription,
CheckoutSession, WebhookEvent, Invoice, Refund, Dispute, LedgerEntry, Payout, ApiKey.
Unique compound indexes protect active-subscription-per-price, card tokens, invoice numbers,
webhook event IDs and API key hashes; secondary indexes cover every sort/filter used.

**Pages (19):** login, register, overview, customers list/detail, products, prices,
subscriptions list/detail, checkout list/hosted session, invoices list/detail, refunds,
disputes, balance, payouts, API keys, webhooks, plus global not-found and error boundaries.

**Slices:** (1) auth + CRUD, (2) search/filter/sort/pagination, (3) subscription lifecycle +
checkout, (4) invoices/ledger/refunds/disputes/payouts/webhooks, (5) dashboard + UI precision.
Each slice was validated with curl assertions and a clean typecheck before committing.

**Edge cases covered:** duplicate webhook ID, refund exceeding charge, cancel at period end,
failed payment → `past_due` then retry, integer-unit/tax rounding, restricted API key → `403`.

## Verification

```bash
npm run lint        # 0 errors, 0 warnings
npm run typecheck   # clean
npm run build       # production build
npm run seed        # deterministic dataset, re-runnable
npm start -- -p 3221
npm run verify      # 199 curl assertions: auth, CRUD, filters, workflows, edge cases, pages, HTML
fuser -k 3221/tcp
```

`npm run verify` drives every HTTP call through `curl` (via `child_process`) with a cookie
jar, counts pass/fail, and checks rendered HTML content and 200/307/404 page statuses.
Token/tool-call counts are not exposed by this environment; this report does not invent them.

## Simulation boundary

**No real external service is contacted.** Specifically:

- Charges, refunds and payouts go through the `PaymentGateway` interface in
  `lib/payments/adapter.ts`. `getGateway()` currently returns `LocalPaymentGateway`,
  which generates local `ch_`/`re_`/`po_` references and honors a `success`/`failure`
  outcome. It validates amount and currency at the boundary.
- Checkout "completion" is a local simulation: no redirect to a real processor, no card
  network call. Card tokens are local `pm_tok_*` values; only brand, last4 and expiry are stored.
- Webhooks are **genuinely signed** with HMAC-SHA256 over `timestamp.rawBody`, but the
  sender in tests is local. Delivery, verification, persistence and idempotency are real code.
- Email, SMS, maps, calendars and real payout rails are deliberately out of scope.

### Swapping in a real provider

1. Implement `PaymentGateway` in `lib/payments/adapter.ts` (e.g. `StripeGateway`) using the
   provider SDK for `charge`, `refund` and `payout`. Keep money in integer minor units.
2. Change `getGateway()` to select that implementation when `PAYMENT_ADAPTER=real`
   (the cookie/session and database layers need no changes).
3. Point `WEBHOOK_SECRET` at the provider's signing secret and translate the incoming
   signature header into the `t=<unix>,v1=<hmac>` format expected by
   `lib/webhooks.ts#verifyWebhookSignature`, or adapt that verifier to the provider's scheme.
4. Replace the local token form with the provider's hosted tokenization/JS widget; store
   only the provider token, brand, last4 and expiry as `PaymentMethod` records.

All business rules (permissions, subscriptions, workflows, ledger invariants) are real
and provider-independent.

## Known limitations

- Single shared workspace: any signed-in dashboard user may act on any record; there is no
  per-user ownership model or team invites.
- Billing cycles are advanced manually via `POST /api/subscriptions/[id]/cycle`; no scheduler
  or cron worker is included.
- MRR normalizes yearly prices by simple division by 12; no proration or discounts.
- Only three currencies are supported (`usd`, `eur`, `gbp`) and no FX conversion is performed.
- Payout availability uses the ledger counter minus pending payouts; no banking reconciliation.
- Dispute outcomes are recorded manually; no evidence-upload workflow or deadline handling.

### Top 3 improvements

1. Add a scheduled billing worker with dunning and proration.
2. Add per-workspace/per-user authorization with roles and audit logs.
3. Add a real adapter implementation plus a webhook signature translator for a live provider.
