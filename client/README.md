# @nextera/client

The Nextera customer app (`nextera.srahira.com`), a Srahira platform. Next 16 App Router, React 19, Tailwind 4,
TanStack Query 5, Vitest.

| Route | What it is |
|---|---|
| `/` | Public landing: hero, how it works, live plans (`GET /v1/plans`, revalidated every 5 minutes), returns calculator, disclosures |
| `/enquire` | Public enquiry form, posts server-side to `POST /v1/leads` |
| `/portal/login` | Mobile OTP sign-in (`/v1/auth/otp/request` → `/v1/auth/otp/verify`), honours `?next=` for `/portal` paths only |
| `/portal` | Dashboard: welcome, Your investments summary, onboarding checklist (KYC, then bank account, then first investment), open plans |
| `/portal/plans` | Open plans and the calculator |
| `/portal/plans/[slug]` | Plan detail, prefilled calculator (`?amount=`), Invest panel linking to the invest flow or KYC |
| `/portal/kyc` | KYC status (masked PAN, rejection reason) and the submit or resubmit form: PAN, name as on PAN, date of birth, address, consent (`GET`/`PUT /v1/kyc`) |
| `/portal/bank` | Bank accounts with status, primary and reasons; add an account by penny-drop once KYC is verified (`GET`/`POST /v1/bank-accounts`, `POST /v1/bank-accounts/:id/primary`) |
| `/portal/profile` | Name, mobile, email and KYC status from `/v1/auth/me`; sign out of this device |
| `/portal/invest/new/[slug]` | Amount entry with plan limits and a live projection; KYC and bank gates; creates the intent |
| `/portal/invest/[id]` | Agreement preview, consent OTP, then Pay through Cashfree checkout |
| `/portal/invest/[id]/status` | Payment status, polled from the backend until it is final |
| `/portal/investments`, `/portal/investments/[id]` | Investments list; detail with growth chart, schedule and documents |
| `/portal/documents`, `/portal/statements` | All documents with view and download; ledger movements, newest first, with Load more |
| `/api/me`, `/api/plans`, `/api/plans/[slug]`, `/api/kyc`, `/api/bank-accounts` | Same-origin GET handlers used by TanStack Query in the browser |
| `/api/investments`, `/api/investments/summary`, `/api/investments/[id]`, `/api/investments/[id]/payment` | Investment reads; `payment` refreshes the order status and never activates |
| `/api/investments/[id]/agreement`, `/api/investments/[id]/bond`, `/api/documents/[id]/file` | Stream the backend PDF; inline by default, `?download=1` for an attachment |
| `/api/documents`, `/api/statements?cursor=` | Document list; statement pages of 25 |

## How it talks to the backend

The browser never calls the backend. The server-only client in `src/lib/backend/` does the following:

- Sends `x-service-key` (the portal key).
- Forwards the customer's bearer token from the `nextera_portal_session` cookie.
- Forwards the visitor IP (first `x-forwarded-for` entry, else `x-real-ip`, as set by Vercel) as both `x-client-ip` (which the backend prefers, because Railway's edge rewrites `x-forwarded-for`) and `x-forwarded-for`, and the browser UA as `x-client-user-agent`.
- Times out after `NEXTERA_BACKEND_TIMEOUT_MS`.
- Never caches, except for the anonymous public plans read on `/`.

Reads in client components go through `useQuery` against the `/api/*` route handlers, with keys from
`src/lib/queries/keys.ts` and shared `queryOptions` in `src/lib/queries/options.ts`. Pages prefetch on the server
and hydrate with `HydrationBoundary`. Writes are server actions called from `useMutation` hooks in
`src/lib/queries/mutations.ts` (KYC submit, add bank account, make primary, logout). Each action validates its input
with the same rules as the backend before calling it, so a malformed account number never spends a penny-drop
attempt. It returns a typed result rather than throwing, and the hook turns failures into `ApiError`, so a 401 or
blocked account takes the same sign-in redirect as a failed read.

Server action bodies are capped at 100 KB (`experimental.serverActions.bodySizeLimit` in `next.config.ts`, down from
Next's 1 MB default). Every portal form is small JSON-like text, and the backend's KYC API takes no document uploads,
so nothing legitimate comes near the limit. If document uploads are added later, raise the limit for that action's
payload (plus about 20 KB of multipart overhead) and remember Vercel Functions cap request bodies at 4.5 MB.

The session cookie is httpOnly, Secure, SameSite=Lax, Path=/ and host-only. It is named
`__Host-nextera_portal_session` in production and `nextera_portal_session` in development. `src/proxy.ts`
redirects anonymous `/portal/*` requests to login. The portal layout then validates the session against
`/v1/auth/me` and sends dead sessions to `/portal/login?expired=1&next=…`.

The proxy clears the cookie on that page only after the backend confirms the token is no longer valid. A forged
`?expired=` link therefore cannot sign anyone out. If the backend rejects the service key itself (401 on `/v1/ping`),
the app logs a configuration error and does not log customers out. Only user-safe backend messages are shown to
customers (otp_*, validation, rate_limited, account_blocked, not_found); everything else gets generic wording and
is logged by code.

## Commands

Run these from the monorepo root:

```bash
npm install
npm run dev -w @nextera/client
npm test -w @nextera/client
npm run lint -w @nextera/client
npm run typecheck -w @nextera/client
npm run build -w @nextera/client
```

Copy `.env.example` to `.env.local` and point it at a running backend.

The session cookie always carries `Secure`, which the production `__Host-` name requires. In development this is kept on
deliberately rather than relaxed. Chrome, Edge and Firefox accept Secure cookies on `http://localhost`, but Safari
does not, so signing in on plain-HTTP localhost will appear to do nothing in Safari. To test in Safari, run the dev
server over HTTPS:

```bash
npm run dev -w @nextera/client -- --experimental-https
```

## Investing and payments

1. Amount entry checks the plan minimum and maximum before calling the backend. Projections use the contracts
   `calculateReturns` and `projectSchedule`.
2. `createInvestmentAction` posts `{planSlug, amountPaise}`. A `kyc_not_verified` error links to `/portal/kyc`, and
   `bank_account_required` links to `/portal/bank`.
3. The agreement PDF is shown inline in an iframe on wide screens, with open and download links. The consent code is
   requested and verified through server actions. Codes must be 6 digits before they are sent, resends have a 30 s
   cooldown, and rate limits show the wait time.
4. `startPaymentAction` returns only `paymentSessionId` and the mode. The browser loads `@cashfreepayments/cashfree-js`
   on demand and calls `checkout({paymentSessionId, redirectTarget: "_modal"})`. No Cashfree credential reaches the
   browser.
5. When checkout completes, the customer goes to `/portal/invest/[id]/status`, which polls
   `GET /api/investments/[id]/payment`: every 3 s for 2 minutes, then every 10 s up to 15 minutes. After activation it
   polls every 5 s, for up to 5 minutes, until the bond number appears. The page ignores query parameters from the
   return URL. Only an investment the backend reports as `active` counts as paid.

Set the backend `PG_RETURN_URL` to `https://nextera.srahira.com/portal/invest/{investment_id}/status`. It is used when
Cashfree has to redirect, for example inside in-app browsers.

Headers (`next.config.ts`):

- The site keeps `X-Frame-Options: DENY` and `frame-ancestors 'none'`.
- The three PDF routes override these with `SAMEORIGIN` and `frame-ancestors 'self'`, so only our own pages can embed
  them. The handlers also send `Cache-Control: private, no-store` and `nosniff`.
- No other CSP directives are set. The Cashfree SDK script (`https://sdk.cashfree.com/js/v3/cashfree.js`) and its
  checkout frames therefore load without allowlisting.
- If a `script-src`, `frame-src` or `connect-src` policy is added later, it must allow `https://sdk.cashfree.com` and
  the Cashfree checkout origins (`https://*.cashfree.com`).

## Environment

| Variable | Notes |
|---|---|
| `NEXTERA_BACKEND_URL` | Backend origin, e.g. `https://api.nextera.srahira.com` |
| `NEXTERA_PORTAL_SERVICE_KEY` | The backend's `PORTAL_SERVICE_KEY`; server-only, never `NEXT_PUBLIC_` |
| `NEXTERA_BACKEND_TIMEOUT_MS` | Optional, default `10000` |
| `NEXTERA_CASHFREE_MODE` | `sandbox` (default) or `production`; must match the backend `CASHFREE_ENV`, otherwise payment sessions are refused |

If the backend variables are missing or the backend is down:

- `/` renders with a notice and an illustrative calculator.
- The enquiry form shows its fallback message.
- Sign-in reports that the service is unavailable.

## Deploy on Vercel

- Create a Vercel project from this monorepo with **Root Directory** `frontend/client` and the Next.js framework preset.
- Vercel installs from the repo root through npm workspaces, so `@nextera/contracts` resolves from `packages/contracts`.
  `transpilePackages` compiles it. `next.config.ts` sets `turbopack.root` and `outputFileTracingRoot` to the monorepo root.
- Set `NEXTERA_BACKEND_URL` and `NEXTERA_PORTAL_SERVICE_KEY` for Production and Preview. Preview should use a staging
  backend and key.
- Add the domain `nextera.srahira.com`. The `__Host-` cookie needs HTTPS, which Vercel provides.
- The app writes nothing to disk. The enquiry rate limiter is in memory and per instance, as a first line only; the
  backend enforces the real limits.
