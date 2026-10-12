# Plan 2: KYC, Bank Verification, Storage, Settings and Staff Management

**Goal:** Add the backend for customer KYC submission and staff review, penny-drop bank account verification, platform settings, a private file store, and owner-run staff management.

**Spec:** `docs/specs/2026-10-10-investment-platform-design.md` (Decisions, Admin, Data model, Security).

**Builds on:** Plan 1 patterns: `createApp(deps)` with injected services, route factories, `AppError`, `recordAudit`, `requireStaff`, `requireCustomer`, `onlyService`, PGlite tests via `createTestContext`.

## Decisions

- PAN is masked as `XXXXXX` plus its last four characters (`XXXXXX234F`); account numbers as `XXXX` plus `account_last4`. Full values never leave the backend, including audit rows.
- `Cipher` gains `fingerprint(plain)`: HMAC-SHA256 under a key derived from `DATA_KEY`. Used as a blind index so one PAN belongs to one customer and a customer cannot pay twice to verify the same account.
- KYC status lives only on `customers.kyc_status`. `kyc_profiles` has one row per customer, editable while `none`/`rejected`, locked while `submitted`/`verified`.
- Age is checked against the injected clock in IST: the 18th birthday must be on or before today.
- Settings are stored as overrides in `settings(key, value jsonb)`; code defaults (`tds_rate_bps`=0, `min_withdrawal_paise`=100000) apply when a row is absent, so truncating tables never loses defaults.
- Each penny-drop attempt is a `bank_accounts` row (`pending` → `verified`/`failed`). The daily limit (5 per customer per rolling 24 h) counts rows in the database under a customer row lock, so it survives restarts and concurrent requests. The vendor call happens outside the transaction.
- Name match is stored, not enforced; only `account_status=INVALID` rejects.
- New error codes: `bank_account_invalid` (422), `provider_unavailable` (502).
- `must_change_password` is set when staff are created or invited, cleared on change, returned in `StaffProfile`. Enforcement is left to the admin UI.
- Owners cannot change their own role, disable themselves, or remove the last active owner.

## Tasks

1. **Settings** — `src/db/schema/settings.ts`, migration `0002_settings`; `src/settings/service.ts` (`getSettings`, `updateSettings`), `src/settings/adminRoutes.ts`; contracts `settings.ts`. `GET/PATCH /v1/admin/settings` (owner). Tests: defaults, update + audit row, roles, validation.
2. **Fingerprint + masks** — `Cipher.fingerprint`, `src/lib/mask.ts`. Unit tests.
3. **KYC** — schema `kyc.ts`, migration `0003_kyc_profiles`; `src/kyc/service.ts`, `src/kyc/routes.ts`, `src/kyc/adminRoutes.ts`; contracts `kyc.ts`. Endpoints: `GET/PUT /v1/kyc`; `GET /v1/admin/kyc?status=`, `GET /v1/admin/customers/:id/kyc`, `POST /v1/admin/customers/:id/kyc/approve|reject` (owner, ops). Tests: PAN/pincode/date validation, under-18 boundary, lock states, resubmission after reject, masking, ciphertext at rest, duplicate PAN, roles, audit rows, name fill on approve.
4. **Bank verifier** — `src/lib/bankVerifier.ts`: `BankVerifier`, `createCashfreeBankVerifier` (`POST {base}/verification/bank-account/sync`, `x-client-id`/`x-client-secret`), `createFakeBankVerifier`. Tests with stubbed fetch: request shape, valid, invalid, HTTP error, unexpected status.
5. **Bank accounts** — schema `bank.ts`, migration `0004_bank_accounts`; `src/bank/service.ts`, `src/bank/routes.ts`; contracts `bank.ts`. Endpoints: `GET/POST /v1/bank-accounts`, `POST /v1/bank-accounts/:id/primary`. Tests: validation, success → verified + primary, second account not primary, invalid → 422 and failed row, provider error → 502, duplicate verified account → 409 without vendor call, 5/day limit and reset, ciphertext at rest, ownership on primary switch, admin KYC view includes accounts.
6. **File store** — `src/lib/fileStore.ts` (`FileStore`, `createMemoryFileStore`, `createR2FileStore` via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, endpoint `https://<account>.r2.cloudflarestorage.com`, region `auto`). Tests: memory round trip, key validation, R2 presigned URL shape and expiry, put/get through a stubbed client.
7. **Staff management** — migration `0005_staff_must_change_password`; `src/staff/service.ts`, `src/staff/adminRoutes.ts`; `SessionService.revokeAllFor`; `POST /v1/staff/auth/password`; contracts `staff.ts`. Endpoints: `GET /v1/admin/staff`, `POST /v1/admin/staff`, `PATCH /v1/admin/staff/:id`, `POST /v1/admin/staff/:id/disable|enable` (owner). Tests: invite returns secrets once and they work for login, duplicate email, roles, last-owner and self guards, disable revokes sessions, password change (wrong current, short, same, revokes other sessions, clears flag), audit rows.
8. **Wiring and docs** — `AppDeps` gains `bankVerifier`, `files`; `env.ts` adds `BANK_VERIFIER`, `CASHFREE_ENV`, `CASHFREE_VERIFICATION_CLIENT_ID`, `CASHFREE_VERIFICATION_CLIENT_SECRET`, `STORAGE_PROVIDER`, `R2_*` (fakes forbidden in production); `server.ts`, `.env.example`, README endpoint table. Env tests.

## Verification

`npm run typecheck`, `npm test`, `npm run build` all pass.
