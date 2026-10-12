# Nextera — Srahira's investment platform

## Amendments (2026-10-12, override anything below that conflicts)

- The platform is named **Nextera**, a Srahira platform, hosted at
  `nextera.srahira.com`.
- One monorepo, `D:\projects
extera`, replaces the three-repo split:
  `backend/` (Hono API), `frontend/client/` (customer app),
  `frontend/admin/` (staff console), and `packages/contracts/`
  (`@nextera/contracts`, shared by all three through npm workspaces).
- Hosts: client `nextera.srahira.com`, admin `admin.nextera.srahira.com`,
  backend `api.nextera.srahira.com`. In production each Next app's session
  cookie is host-only and uses the `__Host-` prefix.
- The client app's customer routes keep the `/portal/*` paths below. Its `/`
  is a public Nextera landing page with live plans and the calculator, and
  `/enquire` is a public enquiry form that creates leads through
  `POST /v1/leads`.
- The existing `srahira` marketing site is not part of the platform. It only
  links out to Nextera, GoMilesGo and GroTutor from a Platforms menu. Its
  contact-form leads stay in GoMilesGo, so the "Leads migration" section is
  cancelled.
- Both Next apps use TanStack Query. Client components read through
  explicit, same-origin Route Handlers that call the backend server-side;
  there is no generic proxy. Writes go through server actions used as mutation
  functions. Server components prefetch and hydrate. Browsers still never call
  the backend.
- Reference formats: leads `NXL-YYMM-NNNN`, bonds `NXB-YYYY-NNNNNN`.
- Environment variables use the `NEXTERA_` prefix.
- **Hosting.** The two Next apps deploy to **Vercel** as two projects from this
  repo, with root directories `frontend/client` and `frontend/admin`. The
  backend deploys to **Railway** as a long-running Node service built from the
  repo root (so npm workspaces can resolve `@nextera/contracts`), with config
  path `/backend/railway.json` and domain `api.nextera.srahira.com`.
  - The backend runs `src/server.ts`, listening on `$PORT`. Railway's health
    check uses `/health`, migrations run as the pre-deploy command, and SIGTERM
    shuts the server down gracefully.
  - The accrual and payout-sync jobs run on an in-process scheduler started by
    `server.ts`, and as CLI scripts for manual runs. Each run takes a Postgres
    advisory lock so that extra replicas or overlapping runs are no-ops, and
    stays idempotent.
  - Postgres is Railway Postgres or Neon, set through `DATABASE_URL`. Files go
    to R2, never to the container disk.
  - In-memory IP rate limits assume one replica. Limits that cost money, such
    as penny-drop attempts, are kept in Postgres.
  - The frontends forward the client IP they read from Vercel's
    `x-forwarded-for` / `x-real-ip` in an `x-client-ip` header, which the
    backend trusts only from callers holding a service key.
- **Payment activation.** A payment activates its investment only after a
  server-side fetch from Cashfree shows the order `PAID` with a successful INR
  payment for exactly the expected amount. A signature-verified webhook
  triggers that check immediately; the reconcile job runs the same check for
  orders whose webhook never arrived, so a lost webhook cannot strand paid
  money. The payment records which path activated it.


Date: 2026-10-10
Status: approved, awaiting implementation plan

## Problem

Srahira wants customers to invest in fixed-return plans online, watch their
returns grow month by month, withdraw, raise support requests, and hold signed
agreements and bond certificates. Staff need a console to run plans, customers,
leads, payouts, support and analytics.

Today `srahira` is a static Next 16 marketing site with no database and no
login, and its contact form forwards leads to GoMilesGo.

## Regulatory precondition

Accepting public money against a promised fixed return in India may fall under
SEBI Collective Investment Scheme rules, RBI public-deposit rules, or the
Banning of Unregulated Deposit Schemes Act, 2019. Cashfree also reviews this at
merchant onboarding. The platform runs against Cashfree **sandbox** until
Srahira's CA or lawyer confirms the permitted instrument, agreement wording,
mandatory KYC and TDS treatment. Nothing in this design is a legal opinion.

## Decisions

| Decision | Choice |
|---|---|
| Repos | `srahira` (marketing + customer portal), `srahira-backend` (new), `srahira-admin` (new), all under `D:\projects` |
| Data and secrets owner | `srahira-backend` alone. Both frontends hold only the backend URL |
| Backend stack | Node, Hono, Drizzle, Postgres (Neon), zod 3, Vitest |
| Frontends | Next 16, matching this repo's conventions |
| Shared types | `@nextera/contracts` package of zod schemas published from the backend repo |
| Customer auth | Mobile OTP only (MSG91). No email or password at signup |
| Staff auth | Email + password (argon2) + TOTP, roles `owner`, `ops`, `support` |
| Sessions | Backend issues an opaque bearer token and stores only its hash. Each Next app keeps its token in its own host-only httpOnly, Secure, cookie (SameSite=Lax for the client portal, SameSite=Strict for the admin console) and calls the backend server-side |
| Backend exposure | Browsers never call the backend directly and no CORS is enabled. Every `/v1` call carries a per-app service key (`x-service-key`); staff routes accept only the admin key. Webhooks are exempt and HMAC-verified instead |
| Returns | Simple interest on an annual rate, credited monthly |
| Withdrawable | Credited returns any time; principal only after maturity |
| Withdrawal approval | Every withdrawal is approved by staff before payout |
| Pay-ins | Cashfree Payment Gateway |
| Payouts | Cashfree Payouts, single and batch transfer |
| Bank verification | Cashfree penny-drop before first investment |
| Agreements and bonds | Backend-generated PDF, accepted with an OTP consent; no Aadhaar e-sign |
| Leads | Srahira contact form moves from GoMilesGo to `srahira-backend` |
| Money representation | Integer paise (`bigint`); rates in basis points |
| Balances | Derived from an append-only ledger, never stored as a mutable number |
| TDS | Configurable rate, default 0%, deducted at accrual as its own ledger line |
| File storage | Private S3-compatible bucket (Cloudflare R2), signed URLs only |

## Non-goals

- No compounding, per-plan payout frequency, or early principal withdrawal.
- No Aadhaar e-sign provider.
- No email or Google login for customers.
- No mobile app; the portal is responsive web.
- No separate analytics warehouse; analytics query the operational database.
- No migration of existing `SRA-` leads out of GoMilesGo unless requested
  separately.
- No change to the marketing pages' static rendering.

## Architecture

```
 srahira (Next 16)                   srahira-admin (Next 16)
 ├ marketing site                    ├ plans
 ├ /contact → backend /v1/leads      ├ customers + KYC review
 └ /portal (customer)                ├ leads → convert to customer
                                     ├ withdrawals + payouts
                                     ├ support desk
                                     └ analytics
            │  server-side HTTPS JSON, bearer      │
            └──────────────┬──────────────────────┘
                     srahira-backend (Hono)
                     ├ /v1/auth
                     ├ /v1/plans /v1/investments /v1/wallet /v1/withdrawals
                     ├ /v1/support /v1/documents /v1/leads
                     ├ /v1/admin/*  (role-guarded)
                     ├ /webhooks/cashfree/pg  /webhooks/cashfree/payouts
                     └ cron: accrual (daily), payout status sync (15 min)
                        │              │            │
                  Cashfree PG/Payouts  MSG91       R2
```

Customer pages live under `/portal/*` and render dynamically, guarded by
`proxy.ts`. Marketing pages stay static. The admin app is deployed on its own
domain, and its session cookie is scoped to it.

## Customer portal (`srahira` /portal)

| Route | Purpose |
|---|---|
| `/portal/login` | Phone entry, OTP verify |
| `/portal` | Dashboard: total invested, returns credited, wallet balance, next credit date, growth chart |
| `/portal/kyc` | PAN, name, DOB, address, bank account; penny-drop status |
| `/portal/plans` | Active plans with calculator |
| `/portal/plans/[slug]` | Plan detail, amount entry, agreement preview, OTP consent, Cashfree checkout |
| `/portal/investments/[id]` | Per-investment growth (actual + projected), schedule, documents |
| `/portal/wallet` | Balance, withdraw request, withdrawal status |
| `/portal/history` | Payments and withdrawals, filterable |
| `/portal/documents` | Agreements, bond certificates, statements |
| `/portal/support` | Tickets list, new ticket, thread |

## Admin (`srahira-admin`)

| Area | Capabilities | Roles |
|---|---|---|
| Plans | Create, edit, activate, archive | owner, ops |
| Customers | Create, edit, block, close (refused with any balance), KYC approve/reject, view ledger | owner, ops; support read-only |
| Manual adjustment | Ledger credit/debit with mandatory reason | owner |
| Leads | List, filter, update status, convert to customer | owner, ops, support |
| Withdrawals | Approve/reject single or bulk; create payout batch; retry failed | owner, ops |
| Payables | Per customer and total: wallet balance, pending withdrawals, returns due in 30 days, principal maturing in 30/90 days | owner, ops |
| Support | Queue by status/category/assignee, reply, assign, close | all |
| Analytics | AUM, money in vs out by month, returns credited, upcoming liabilities, investments by plan, new customers per month, lead conversion, open queues | owner, ops |
| Staff | Invite, change role, disable | owner |

Every admin write produces an `audit_log` row.

## Money model

### Accounts

Each customer has ledger accounts:

- `principal:<investmentId>`: money currently invested
- `wallet`: credited net returns and matured principal; withdrawable
- `withdrawal_hold`: money committed to a withdrawal in progress

Platform-side counter-accounts are `platform:cash_in`, `platform:returns_expense`,
`platform:tds_payable`, `platform:cash_out` and `platform:adjustments`, so every
movement is two balanced entries. A balance is the sum of its entries.

### Movements

| Event | Debit | Credit |
|---|---|---|
| Payment confirmed | `platform:cash_in` | `principal:<id>` |
| Monthly accrual (gross G, TDS T) | `platform:returns_expense` G | `wallet` G−T, `platform:tds_payable` T |
| Maturity | `principal:<id>` | `wallet` |
| Withdrawal requested | `wallet` | `withdrawal_hold` |
| Withdrawal rejected or payout failed | `withdrawal_hold` | `wallet` |
| Payout succeeded | `withdrawal_hold` | `platform:cash_out` |
| Manual adjustment | `platform:adjustments` or customer account | the other side |

Every posting is one `ledger_transactions` row holding a unique
`idempotency_key` derived from its cause (for example
`accrual:<investmentId>:<periodNo>`) plus its balanced `ledger_entries`, so a
retried job or a duplicate webhook cannot double-post. Postings take a
per-customer advisory lock so concurrent requests cannot overdraw. Customer accounts may never go negative; a
mutation that would make one negative fails its transaction.

### Accrual

- Monthly gross return is `floor(principal_paise × rate_bps / 10000 / 12)`.
  ₹13,50,000 at 800 bps gives ₹9,000 a month and ₹18,000 after two months.
- Period *n* is due on the *n*-th monthly anniversary of `start_date`; when that
  day doesn't exist in the month, it falls on the month's last day.
- A daily job posts every due, unposted period. `accruals` is unique on
  `(investment_id, period_no)`, so missed days catch up and reruns are no-ops.
- After the final period, the job posts maturity and sets the investment to
  `matured`.
- `projectSchedule(principal, rateBps, tenureMonths, startDate)` is one pure
  function in `@nextera/contracts`, used by the accrual job, the portal growth
  chart and the calculator.

### Investment lifecycle

`pending_payment → active → matured`, with `pending_payment → cancelled` when
the Cashfree order expires or fails.

1. KYC must be `verified` and a primary bank account penny-drop verified.
2. The amount must fall within the plan's min/max, and the plan must be `active`.
3. The backend snapshots `rate_bps` and `tenure_months`, generates the agreement
   PDF, and sends a consent OTP. On verification it stores the document hash,
   time, IP, user agent and OTP challenge id.
4. The backend creates a Cashfree order and returns the payment session id to
   the portal.
5. Activation requires a signature-verified PG webhook **and** a server-side
   order fetch reporting `PAID` for the exact amount. The return URL only shows
   status and never activates anything.
6. On activation: post the payment entries, set `start_date` to the payment
   date, compute `maturity_date`, assign `bond_no` (`SRB-YYYY-NNNNNN`), and
   generate the bond certificate.

### Withdrawals and payouts

`requested → approved → processing → paid`, with `requested → rejected` and
`processing → failed`.

- A request is accepted up to the wallet balance, and its amount moves to
  `withdrawal_hold` in the same transaction.
- Staff approve or reject one request or many.
- Approved requests are paid by single transfer or as a `payout_batches` batch
  transfer to the customer's verified primary bank account.
- The payout webhook, backed by a 15-minute status-sync job, moves a request to
  `paid` or `failed`. A failure or rejection returns the money to `wallet` and
  notifies the customer by SMS.
- Failed payouts can be retried by staff, which creates a new transfer id.

## Data model

| Table | Key columns |
|---|---|
| `customers` | id, phone (unique, E.164), name, email?, status `active`/`blocked`/`closed`, kyc_status `none`/`submitted`/`verified`/`rejected`, created_via `self`/`admin`/`lead`, lead_id? |
| `kyc_profiles` | customer_id, pan (encrypted), pan_name, dob, address, submitted_at, verified_at, reviewed_by, rejection_reason |
| `bank_accounts` | customer_id, account_no (encrypted), account_last4, ifsc, holder_name, penny_drop_ref, verified_at, is_primary |
| `otp_challenges` | id, phone, purpose `login`/`consent`, code_hash, attempts, expires_at, consumed_at |
| `sessions` | token_hash, subject_type `customer`/`staff`, subject_id, expires_at, revoked_at |
| `staff` | id, email, name, password_hash, totp_secret (encrypted), role, failed_logins, locked_until, disabled_at |
| `plans` | id, slug, name, description, rate_bps, tenure_months, min_paise, max_paise, status `draft`/`active`/`archived` |
| `investments` | id, customer_id, plan_id, principal_paise, rate_bps, tenure_months, status, start_date, maturity_date, bond_no |
| `payments` | id, investment_id, cf_order_id (unique), amount_paise, status, webhook_payloads jsonb |
| `accruals` | investment_id, period_no, due_date, gross_paise, tds_paise, posted_at; unique (investment_id, period_no) |
| `ledger_transactions` | id, idempotency_key (unique), ref_type, ref_id, memo, created_at |
| `ledger_entries` | id, transaction_id, customer_id?, account, direction, amount_paise, created_at |
| `withdrawals` | id, customer_id, amount_paise, status, bank_account_id, decided_by, decided_at, reject_reason, cf_transfer_id, batch_id? |
| `payout_batches` | id, created_by, count, total_paise, cf_batch_id, status |
| `documents` | id, customer_id, investment_id?, kind `agreement`/`bond`/`statement`, storage_key, sha256, consent_otp_id?, accepted_at, ip, user_agent |
| `tickets` | id, customer_id, subject, category `payment`/`withdrawal`/`kyc`/`investment`/`other`, status `open`/`pending_customer`/`resolved`/`closed`, priority, assignee_id, investment_id?, withdrawal_id? |
| `ticket_messages` | id, ticket_id, author_type `customer`/`staff`, author_id, body, attachment_key? |
| `leads` | id, ref `SRA-YYMM-NNNN`, name, phone, email, company, interest, message, path, status `new`/`contacted`/`qualified`/`converted`/`lost`, converted_customer_id? |
| `audit_log` | id, actor_type, actor_id, action, entity, entity_id, before jsonb, after jsonb, ip, at |
| `settings` | key, value: `tds_rate_bps`, minimum withdrawal |

## Leads migration

`src/app/contact/actions.ts` keeps its validation, honeypot and rate limit, but
`submitIntake` posts to `NEXTERA_BACKEND_URL/v1/leads` with a server-only
`NEXTERA_LEADS_KEY` header. The `NEXT_PUBLIC_GOMILESGO_INTAKE_*` variables are
removed, which also takes the shared secret out of the `NEXT_PUBLIC_`
namespace. The `SRA-YYMM-NNNN` reference format is kept, numbered by the new
backend.

## Security

- OTP: 6 digits, stored hashed, valid 5 minutes, 5 verification attempts;
  sends limited to 3 per phone per 10 minutes and 20 per IP per hour.
- Login and admin endpoints are rate limited; staff lock out after repeated
  failures.
- Cashfree webhooks are HMAC-verified against the raw body and processed
  idempotently.
- Both frontends mutate only through Next server actions, which enforce an
  Origin check. The backend authenticates with bearer tokens, so it is not
  exposed to cross-site request forgery.
- The client IP is taken from `x-forwarded-for` only on requests carrying a
  valid service key.
- PAN and bank account numbers are encrypted at rest (AES-256-GCM, key from
  env) and masked in every UI.
- Document downloads require an ownership or staff check and use signed URLs
  valid for 5 minutes.
- Each money mutation runs in one database transaction.
- Errors are returned as `{ error: { code, message, fields? } }`.

## Testing

- Unit (Vitest): `projectSchedule` (month-end clamping, rounding, tenure end),
  ledger posting rules, investment and withdrawal state machines, OTP limits.
- Invariant tests: after any sequence of operations, every customer account is
  ≥ 0 and all entries sum to zero.
- Integration against a real Postgres with a Cashfree mock: signup → KYC →
  invest → webhook → accrue → withdraw → approve → payout success and failure,
  plus duplicate webhooks and job reruns.
- End-to-end in Cashfree sandbox before go-live.

## Build order

1. Backend foundation: repo, database, migrations, `@nextera/contracts`, errors, audit log
2. Auth: customer OTP, staff password + TOTP, sessions; portal login; admin login
3. Plans: backend CRUD; admin plans screens; portal plans list and calculator
4. KYC and bank verification: backend; portal KYC; admin KYC review
5. Ledger and accruals: posting service, daily job, growth APIs; portal dashboard and investment pages
6. Pay-ins: agreement consent, Cashfree PG, webhook, bond issue; portal invest flow
7. Withdrawals and payouts: backend, Payouts integration; portal wallet; admin withdrawals, batches and payables
8. Documents: PDF generation, storage, statements; portal documents
9. Support: backend; portal and admin screens
10. Leads: backend endpoint, contact form repoint, admin leads and convert
11. Admin customers management and analytics
