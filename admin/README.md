# @nextera/admin

Nextera staff console for Srahira, served at `admin.nextera.srahira.com`. It is a Next 16 App Router app. The browser only ever talks to this app. Pages, Route Handlers and server actions call the backend (`@nextera/backend`) server-side with the admin service key.

## Setup

From the monorepo root:

```bash
npm install
cp frontend/admin/.env.example frontend/admin/.env.local
```

Set `NEXTERA_ADMIN_SERVICE_KEY` to the backend's `ADMIN_SERVICE_KEY`. Then start both apps:

```bash
npm run dev:backend
npm run dev:admin
```

The console runs on http://localhost:3000.

## First staff member

Staff accounts are created in the backend. With the backend's `.env` in place:

```bash
npm run staff:create -w @nextera/backend -- you@srahira.com owner "Your Name"
```

The command prints a temporary password and an `otpauth://` URI. Add the URI to an authenticator app, sign in at `/login` with email, password and the 6-digit code, then choose a new password. Accounts flagged `mustChangePassword` are always sent to `/account/password` first.

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `NEXTERA_BACKEND_URL` | yes | Backend base URL, e.g. `https://api.nextera.srahira.com` |
| `NEXTERA_ADMIN_SERVICE_KEY` | yes | The backend's `ADMIN_SERVICE_KEY` (at least 16 characters) |
| `NEXTERA_BACKEND_TIMEOUT_MS` | no | Backend request timeout, default `10000` |

All of these are server-only and read at request time. None is exposed to the browser.

## How it fits together

- `src/proxy.ts` sends anonymous requests to `/login`. Anonymous `/api/*` calls get a 401 JSON envelope instead.
- Pages and server actions check the session again through `/v1/staff/auth/me`, using `requireStaff`, `requirePermission` and `authorizeAction` in `src/lib/session.ts`.
- Session cookie:
  - Production: `__Host-nextera_admin_session` (httpOnly, Secure, SameSite=Strict, Path=/, host-only).
  - Local development: `nextera_admin_session`, without Secure.
- Roles: `src/lib/permissions.ts` (`can(role, permission)`) mirrors the spec's role table. The sidebar only lists sections that exist and that the role can use.
- Data layer (TanStack Query):
  - Query keys live in `src/lib/queries/keys.ts`, and shared `queryOptions` in `src/lib/queries/options.ts`. Customers and the audit log keep theirs in `src/lib/queries/customers.ts` and `src/lib/queries/audit.ts`.
  - List filters and pagination live in the URL. Pages parse `searchParams` with the same functions the client uses, so the prefetched query key matches the one the browser asks for.
  - Server components prefetch and wrap their content in `HydrationBoundary`.
  - Client components read through typed GET Route Handlers in `src/app/api/`.
  - Writes are `useMutation` calls to server actions, followed by key invalidation.
  - Reads are never retried on a 4xx. A 401 clears the cache and returns to `/login`.
- Money: amounts are entered in rupees and percent, and sent as paise and basis points via `rupeesToPaise` and `percentToBps` from `@nextera/contracts`.
- Customers (`/customers`): every role can read. Owner and ops create, edit, block, unblock and close; only an owner changes a mobile number. The ledger CSV is downloaded through `GET /api/customers/<id>/ledger/export`, which streams the backend file as an attachment with `Cache-Control: no-store`.
- Manual adjustments are owner only and wallet only, up to ₹1 crore. Each dialog session creates one idempotency key, so a retry or double submit replays the first posting instead of adding a second.
- Audit log (`/audit`): owner only. The entry drawer shows the recorded before and after values as plain text.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev -w @nextera/admin` | Dev server |
| `npm test -w @nextera/admin` | Vitest unit tests |
| `npm run lint -w @nextera/admin` | ESLint |
| `npm run typecheck -w @nextera/admin` | Route type generation plus `tsc --noEmit` |
| `npm run build -w @nextera/admin` | Production build |

## Deploy on Vercel

1. Create a Vercel project from the monorepo with **Root Directory** `frontend/admin`. The framework preset is Next.js.
2. Leave "Include files outside the Root Directory in the Build Step" enabled. Vercel installs at the monorepo root with npm workspaces, and the build compiles `@nextera/contracts` from `packages/contracts` through `transpilePackages`.
3. Set the environment variables `NEXTERA_BACKEND_URL=https://api.nextera.srahira.com` and `NEXTERA_ADMIN_SERVICE_KEY` (the backend's admin key) for Production and Preview.
4. Add the domain `admin.nextera.srahira.com`. The app needs HTTPS in production because of the `__Host-` cookie.

The app does not write to the filesystem. It reads the client IP from `x-forwarded-for` or `x-real-ip` as set by Vercel, and forwards it to the backend as `x-client-ip` (and `x-forwarded-for`) with the user agent.
