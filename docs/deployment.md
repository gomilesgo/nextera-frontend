# Nextera — Deployment Guide

## Architecture

Three services, one monorepo (`D:\projects\nextera`, npm workspaces).

| Service | Package | Host | Platform |
|---|---|---|---|
| `backend/` | `@nextera/backend` | `api.nextera.srahira.com` | Railway |
| `frontend/client/` | `@nextera/client` | `nextera.srahira.com` | Vercel |
| `frontend/admin/` | `@nextera/admin` | `admin.nextera.srahira.com` | Vercel |
| `packages/contracts/` | `@nextera/contracts` | shared TypeScript source | — |

Browsers talk only to the two Next apps. Each Next app calls the backend server-side using its own service key in an `x-service-key` header. The backend never has CORS enabled. Webhooks bypass service-key auth and are HMAC-verified instead.

### Service keys

The client app sends `NEXTERA_PORTAL_SERVICE_KEY` (maps to backend `PORTAL_SERVICE_KEY`). The admin app sends `NEXTERA_ADMIN_SERVICE_KEY` (maps to backend `ADMIN_SERVICE_KEY`). The two keys must differ. Staff routes (`/v1/admin/*`, `/v1/staff/*`) reject the portal key.

### Client IP forwarding

Vercel's edge modifies `x-forwarded-for`, so each Next app reads the end-user IP from `x-forwarded-for` or `x-real-ip` in its server-only backend client and forwards it to the backend in an `x-client-ip` header. The backend trusts `x-client-ip` only from callers that presented a valid service key. In-memory OTP rate limits (non-money) assume a single replica; money-costing limits such as penny-drop attempts are stored in Postgres and are safe with multiple replicas.

---

## Railway — Backend

### Project settings

| Setting | Value |
|---|---|
| Root directory | repo root (so npm workspaces can resolve `@nextera/contracts`) |
| Config-as-code path | `/backend/railway.json` |

### Commands (from `backend/railway.json`)

| Phase | Command |
|---|---|
| Build | `npm run build -w @nextera/backend` |
| Pre-deploy | `node backend/dist/migrate.js` |
| Start | `node backend/dist/server.js` |

The `build` command runs `tsup` inside the backend workspace. The resulting JS lands in `backend/dist/`.

### Health check

`GET /health` returns `{"status":"ok"}` and 200 when the database is reachable, or `{"status":"unavailable"}` and 503 otherwise. Railway polls this path with a 120-second timeout.

### SIGTERM and graceful shutdown

On SIGTERM the server stops accepting new connections (`server.close()`), closes idle connections, stops the job scheduler, and waits for in-flight jobs. If shutdown is not complete within 25 seconds the process exits with code 1. Railway's `drainingSeconds` is 30 and `overlapSeconds` is 10 (set in `railway.json`).

### Replica count

Run a **single replica** in production. The in-process rate limiter (`src/lib/rateLimit.ts`) is in-memory and does not share state across replicas. The scheduler jobs use Postgres advisory locks (`pg_try_advisory_lock`) so concurrent runs across replicas are safe no-ops — extra replicas skip the job rather than double-executing it. However the in-memory IP rate limits for non-money operations (OTP requests etc.) are per-process; multiple replicas weaken them. Deploy more than one replica only if you first move rate-limit state to Postgres or Redis.

### Postgres

Set `DATABASE_URL` to a Postgres connection string. Railway Postgres or Neon both work. Migrations run automatically as the pre-deploy command before each new deployment.

---

## Vercel — Client and Admin

### Project settings

| Setting | `@nextera/client` | `@nextera/admin` |
|---|---|---|
| Root directory | `frontend/client` | `frontend/admin` |
| Framework preset | Next.js | Next.js |
| Install command | `cd ../.. && npm install` | `cd ../.. && npm install` |

The install command must run from the repo root so that npm workspaces can resolve `@nextera/contracts`. Both `next.config.ts` files set `outputFileTracingRoot` to the workspace root and `transpilePackages: ["@nextera/contracts"]` so the shared package is compiled into the Next build.

### Domains

| Project | Domain |
|---|---|
| `@nextera/client` | `nextera.srahira.com` |
| `@nextera/admin` | `admin.nextera.srahira.com` |

---

## DNS Records

| Hostname | Type | Value |
|---|---|---|
| `nextera.srahira.com` | CNAME | Vercel-assigned alias (`cname.vercel-dns.com`) |
| `admin.nextera.srahira.com` | CNAME | Vercel-assigned alias |
| `api.nextera.srahira.com` | CNAME | Railway-assigned domain |

Vercel provides the exact CNAME target in the project's Domains tab after you add the custom domain. Railway provides it in the service's Settings > Domain panel.

---

## Environment Variables

### Backend (`api.nextera.srahira.com`)

| Variable | Required | Example / format | Purpose |
|---|---|---|---|
| `NODE_ENV` | required | `production` | Must be `production` in prod; enables production-only validations |
| `PORT` | optional | `4000` | TCP port the server listens on; Railway sets this automatically |
| `HOST` | optional | `::` | Bind address |
| `DATABASE_URL` | required | `postgres://user:pass@host/db` | Postgres connection string |
| `DB_POOL_MAX` | optional | `10` | Max pool connections (1–100) |
| `DB_STATEMENT_TIMEOUT_MS` | optional | `30000` | Per-statement timeout in ms |
| `SCHEDULER_ENABLED` | optional | `true` | Set `false` to disable the in-process job scheduler |
| `PAYMENT_RECONCILE_AFTER_MINUTES` | optional | `15` | Orders older than this are checked by the reconcile job |
| `DATA_KEY` | required | 40+ character random hex | AES encryption key for PII at rest (KYC cipher) |
| `OTP_PEPPER` | required | 32+ character random string | HMAC pepper for OTP hashes |
| `PORTAL_SERVICE_KEY` | required | 32+ character random string | Service key accepted from the client Next app |
| `ADMIN_SERVICE_KEY` | required | 32+ character random string, different from `PORTAL_SERVICE_KEY` | Service key accepted from the admin Next app |
| `SMS_PROVIDER` | required | `msg91` | `console` logs to stdout (forbidden in production); `msg91` sends real SMS |
| `MSG91_AUTH_KEY` | required with `SMS_PROVIDER=msg91` | MSG91 auth key | MSG91 API authentication |
| `MSG91_OTP_TEMPLATE_ID` | required with `SMS_PROVIDER=msg91` | DLT template ID | OTP SMS template |
| `MSG91_CONSENT_TEMPLATE_ID` | required with `SMS_PROVIDER=msg91` | DLT template ID | Investment consent OTP template |
| `MSG91_WITHDRAWAL_PAID_TEMPLATE_ID` | required with `SMS_PROVIDER=msg91` | DLT template ID | Withdrawal paid notice |
| `MSG91_WITHDRAWAL_REJECTED_TEMPLATE_ID` | required with `SMS_PROVIDER=msg91` | DLT template ID | Withdrawal rejected notice |
| `MSG91_PAYOUT_FAILED_TEMPLATE_ID` | required with `SMS_PROVIDER=msg91` | DLT template ID | Payout failed notice |
| `MSG91_KYC_APPROVED_TEMPLATE_ID` | required with `SMS_PROVIDER=msg91` | DLT template ID | KYC approved notice |
| `MSG91_KYC_REJECTED_TEMPLATE_ID` | required with `SMS_PROVIDER=msg91` | DLT template ID | KYC rejected notice |
| `MSG91_SUPPORT_REPLY_TEMPLATE_ID` | required with `SMS_PROVIDER=msg91` | DLT template ID | Support ticket reply notice |
| `BANK_VERIFIER` | required | `cashfree` | `fake` is forbidden in production |
| `CASHFREE_ENV` | optional | `production` | `sandbox` or `production`; applies to all three Cashfree products |
| `CASHFREE_VERIFICATION_CLIENT_ID` | required when `BANK_VERIFIER=cashfree` | Cashfree client ID | Bank account penny-drop |
| `CASHFREE_VERIFICATION_CLIENT_SECRET` | required when `BANK_VERIFIER=cashfree` | Cashfree client secret | Bank account penny-drop |
| `PAYMENT_GATEWAY` | required | `cashfree` | `fake` is forbidden in production |
| `CASHFREE_PG_CLIENT_ID` | required when `PAYMENT_GATEWAY=cashfree` | Cashfree client ID | Payment Gateway orders |
| `CASHFREE_PG_CLIENT_SECRET` | required when `PAYMENT_GATEWAY=cashfree` | Cashfree client secret | Payment Gateway orders |
| `PG_RETURN_URL` | optional | `https://nextera.srahira.com/portal/invest/return` | Cashfree PG redirect-back URL |
| `PG_NOTIFY_URL` | optional | `https://api.nextera.srahira.com/v1/webhooks/cashfree/pg` | Cashfree PG webhook delivery URL |
| `PAYOUTS_PROVIDER` | required | `cashfree` | `fake` is forbidden in production |
| `CASHFREE_PAYOUT_CLIENT_ID` | required when `PAYOUTS_PROVIDER=cashfree` | Cashfree client ID | Payouts API |
| `CASHFREE_PAYOUT_CLIENT_SECRET` | required when `PAYOUTS_PROVIDER=cashfree` | Cashfree client secret | Payouts API |
| `CASHFREE_PAYOUT_PUBLIC_KEY` | required in production with `PAYOUTS_PROVIDER=cashfree` | PEM RSA public key (single line or multiline) | 2FA signing for batch payouts |
| `STORAGE_PROVIDER` | required | `r2` | `memory` is forbidden in production |
| `R2_ACCOUNT_ID` | required when `STORAGE_PROVIDER=r2` | Cloudflare account ID | R2 file storage |
| `R2_ACCESS_KEY_ID` | required when `STORAGE_PROVIDER=r2` | R2 access key | R2 file storage |
| `R2_SECRET_ACCESS_KEY` | required when `STORAGE_PROVIDER=r2` | R2 secret key | R2 file storage |
| `R2_BUCKET` | required when `STORAGE_PROVIDER=r2` | bucket name | R2 bucket for agreements, bonds, support attachments |

### Client (`nextera.srahira.com`)

| Variable | Required | Example / format | Purpose |
|---|---|---|---|
| `NEXTERA_BACKEND_URL` | required | `https://api.nextera.srahira.com` | Backend base URL, server-side only |
| `NEXTERA_PORTAL_SERVICE_KEY` | required | 16+ character string matching backend `PORTAL_SERVICE_KEY` | Sent in `x-service-key` on every backend call |
| `NEXTERA_BACKEND_TIMEOUT_MS` | optional | `10000` | Backend request timeout in ms (1000–60000) |
| `NEXTERA_CASHFREE_MODE` | optional | `production` | `sandbox` or `production`; must match `CASHFREE_ENV` on the backend. Defaults to `sandbox` if unset |

### Admin (`admin.nextera.srahira.com`)

| Variable | Required | Example / format | Purpose |
|---|---|---|---|
| `NEXTERA_BACKEND_URL` | required | `https://api.nextera.srahira.com` | Backend base URL, server-side only |
| `NEXTERA_ADMIN_SERVICE_KEY` | required | 16+ character string matching backend `ADMIN_SERVICE_KEY` | Sent in `x-service-key` on every backend call |
| `NEXTERA_BACKEND_TIMEOUT_MS` | optional | `10000` | Backend request timeout in ms (1000–60000) |

---

## Cashfree Webhook URLs

Register these in the Cashfree dashboard under your merchant account:

| Product | Event | URL |
|---|---|---|
| Payment Gateway | All payment events | `https://api.nextera.srahira.com/v1/webhooks/cashfree/pg` |
| Payouts | All payout events | `https://api.nextera.srahira.com/v1/webhooks/cashfree/payouts` |

Both endpoints are at `/v1/webhooks/` which is exempt from service-key auth. Signatures are verified using HMAC with the webhook secret Cashfree provides in the dashboard.

The PG webhook URL should also be supplied in `PG_NOTIFY_URL` so the backend sets it when creating orders.

Cashfree Payouts requires a beneficiary to be added before a transfer can be made. The backend creates beneficiaries automatically; no manual step is needed. Cashfree may require IP whitelisting for the Payouts API — add the Railway service's outbound IPs (visible in Railway's service settings under "Networking") to the Cashfree Payouts IP whitelist.

---

## First-Deploy Steps

### 1. Provision Postgres

In Railway, add a Postgres plugin to your project. Copy the `DATABASE_URL` from its Connect tab into the backend service's environment variables.

### 2. Run migrations

Migrations run automatically as the pre-deploy command (`node backend/dist/migrate.js`) before each deployment, including the first. No manual step is needed beyond confirming the deployment succeeded.

### 3. Seed the first owner account

There is a CLI script for this. Run it from within the Railway service's shell (or locally with `DATABASE_URL` set to the production database):

```
npm run staff:create -w @nextera/backend -- owner@example.com owner "Owner Name"
```

The script prints a temporary password and an `otpauth://` URL. Add that URL to an authenticator app (Google Authenticator, Authy, 1Password, etc.) before the temporary password is used. The staff member must then change their password on first login.

### 4. TOTP enrolment

The `otpauth://` URL from the step above is the TOTP secret. Scan it with an authenticator app. TOTP is required for every staff login; there is no fallback. Store the backup codes (if your authenticator provides them) securely.

---

## Pre-Launch Checklist

- Run backend tests against a real Postgres instance by setting `TEST_DATABASE_URL` to a test database and running `npm test -w @nextera/backend`. PGlite is used by default; running against real Postgres catches any Postgres-specific behaviour.
- Complete a Cashfree PG sandbox end-to-end test: create an investment, pay through the sandbox checkout, verify the investment activates via both the webhook path and the reconcile job.
- Complete a Cashfree Payouts sandbox end-to-end test including a batch payout run.
- Migration `0011_payout_unconfirmed.sql` uses `ALTER TYPE ... ADD VALUE`, which is non-transactional in Postgres and cannot be rolled back in a transaction. If the pre-deploy migration fails partway through, the enum value may already exist on re-run. Drizzle handles this gracefully (the value is present, the migration is re-attempted). No special action is needed, but note that rolling back to the previous release after this migration has run requires a manual schema change.
- **Known risk — double payment on failed payout:** If a staff member marks a payout as failed via the admin console after the money has already left the Cashfree account, a retry will trigger a second transfer. Staff must confirm with Cashfree that the transfer has not settled before marking it failed.
- Obtain legal and CA sign-off on customer-facing agreement wording, plan terms, and TDS treatment before accepting real money.
- Get DLT template approval from MSG91 for all nine SMS templates before setting `SMS_PROVIDER=msg91` in production.
- `consentVersion` is required on every KYC submission. Ensure the client app sends the current value and that the value is updated whenever the terms change.

---

## Operations

### Running jobs manually

All jobs can be run as CLI scripts from the backend workspace. On Railway, use the service shell or a one-off task. Locally, set `DATABASE_URL` (and any required external-service vars) and run:

| Job | Command |
|---|---|
| Accrue monthly returns | `npm run job:accruals -w @nextera/backend` |
| Reconcile pending payments | `npm run job:reconcile-payments -w @nextera/backend` |
| Issue missing bond documents | `npm run job:bond-documents -w @nextera/backend` |
| Sync payout statuses | `npm run job:sync-payouts -w @nextera/backend` |

The compiled variants (`node backend/dist/run-accruals.js` etc.) are equivalent. The `dev` variants (`job:accruals:dev` etc.) use `tsx` and run against the source directly.

### Rollback

Railway keeps previous deployments. To roll back, redeploy the previous image from Railway's deployment history. Note that the pre-deploy migration runs on each deployment; there are no down migrations. If a release includes a destructive schema change, restore from a Postgres backup before redeploying the old image.

### Backups

Enable automated Postgres backups in Railway (Postgres plugin settings) or use `pg_dump` on a cron schedule. Store dumps in R2 or another off-service location. The R2 bucket stores customer documents; back it up with Cloudflare R2's replication or periodic exports.

### Reset a staff password

```
npm run staff:reset -w @nextera/backend -- staff@example.com
```

This generates a new temporary password and a fresh TOTP secret. The staff member must re-enrol their authenticator app.
