# Plan 1: Backend Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `srahira-backend` with its database, shared contracts package, double-entry ledger, customer mobile-OTP auth, staff password + TOTP auth, and the plans API, all covered by tests against a real Postgres engine.

**Architecture:** A Hono app built by `createApp(deps)` with every dependency (database, SMS sender, clock, cipher, keys) injected, so tests run the real HTTP stack against an in-memory PGlite Postgres. Route modules are factories that close over their dependencies. Browsers never call this service: the two Next apps call it server-side with a per-app `x-service-key` and a bearer token.

**Tech Stack:** Node 24, TypeScript 5, Hono 4, `@hono/node-server` 2, `@hono/zod-validator` 0.9, zod 3.25, Drizzle ORM 0.45 + drizzle-kit 0.31, `pg` (production), `@electric-sql/pglite` (tests), `@node-rs/argon2`, `otplib` 13, `libphonenumber-js`, Vitest 3, tsx, tsup.

**Spec:** `D:\projects\srahira\docs\superpowers\specs\2026-10-10-investment-platform-design.md`

This is plan 1 of the build order. Later plans: 2 portal and admin shells with login, 3 plans screens and calculator, 4 KYC and bank verification, 5 investments and accruals, 6 Cashfree pay-ins and documents, 7 withdrawals and payouts, 8 support, 9 leads, 10 admin customers and analytics.

## Global Constraints

- Repo path: `D:\projects\srahira-backend`, a new git repository, npm workspaces with `packages/contracts`.
- Code style: double quotes, semicolons, two-space indent, **no code comments anywhere**.
- zod must stay on `^3.25.76`; TypeScript on `^5`; Vitest on `^3.2.4`.
- Money is integer paise; rates are integer basis points (8% p.a. = `800`). Never use floats for stored money.
- Monthly return is `floor(principal_paise × rate_bps / 10000 / 12)`, computed with `BigInt`.
- Customer ledger accounts: `wallet`, `withdrawal_hold`, `principal:<investmentId>`. Platform accounts: `platform:cash_in`, `platform:returns_expense`, `platform:tds_payable`, `platform:cash_out`, `platform:adjustments`.
- Customer account balances may never go negative.
- OTP: 6 digits, stored as HMAC, valid 5 minutes, 5 verification attempts, 3 sends per phone per 10 minutes, 20 sends per IP per hour.
- Staff lock out for 15 minutes after 5 consecutive failed logins.
- Customer sessions last 7 days, staff sessions 12 hours; only the SHA-256 of a token is stored.
- Every `/v1` request needs a valid `x-service-key`; customer routes accept only the portal key and staff/admin routes only the admin key.
- Errors are always `{ "error": { "code", "message", "fields"?, "retryAfterSeconds"? } }`.
- Every staff write records an `audit_log` row.

## File Structure

```
srahira-backend/
├ package.json                     workspace root, scripts
├ tsconfig.json
├ vitest.config.ts
├ drizzle.config.ts
├ .env.example
├ .gitignore
├ README.md
├ drizzle/                         generated SQL migrations
├ packages/contracts/
│  ├ package.json                  @nextera/contracts, exports ./src/index.ts
│  └ src/
│     ├ index.ts                   re-exports
│     ├ errors.ts                  ErrorCode, ErrorBody
│     ├ money.ts (+ .test.ts)      paise/rupee/bps helpers and formatting
│     ├ schedule.ts (+ .test.ts)   projectSchedule, calculateReturns, date math
│     ├ auth.ts                    auth request schemas and response types
│     └ plans.ts                   plan schemas and Plan type
├ scripts/create-staff.ts          CLI to create a staff member
└ src/
   ├ env.ts (+ .test.ts)           zod-validated environment
   ├ server.ts                     process entry
   ├ app.ts (+ .test.ts)           createApp(deps)
   ├ http/
   │  ├ types.ts                   AppDeps, AppEnv, Clock, ServiceName
   │  ├ errors.ts                  AppError, handleError, onInvalid
   │  └ serviceAuth.ts             serviceAuth, onlyService
   ├ lib/
   │  ├ crypto.ts (+ .test.ts)     hashing, tokens, AES-GCM cipher
   │  ├ phone.ts (+ .test.ts)      Indian mobile normalisation
   │  ├ rateLimit.ts (+ .test.ts)  fixed-window in-memory limiter
   │  ├ pgErrors.ts                isUniqueViolation
   │  └ sms.ts (+ .test.ts)        SmsSender, console and MSG91 senders
   ├ db/
   │  ├ client.ts                  Db, Tx, Executor, createDb
   │  ├ schema.test.ts
   │  └ schema/
   │     ├ index.ts
   │     ├ customers.ts  auth.ts  staff.ts  plans.ts  ledger.ts  audit.ts
   ├ ledger/
   │  ├ accounts.ts                account names
   │  ├ post.ts                    postTransaction, postWithin
   │  ├ balance.ts                 accountBalance, customerBalances
   │  └ ledger.test.ts
   ├ audit/record.ts               recordAudit
   ├ customers/profile.ts          findOrCreateCustomerByPhone, toCustomerProfile
   ├ auth/
   │  ├ otp.ts (+ .test.ts)        createOtpService
   │  ├ sessions.ts (+ .test.ts)   createSessionService
   │  ├ middleware.ts              requireCustomer, requireStaff
   │  ├ customerRoutes.ts (+ .test.ts)
   │  ├ staffAuth.ts               createStaffAuth
   │  └ staffRoutes.ts (+ .test.ts)
   ├ plans/
   │  ├ service.ts                 plan queries and mutations
   │  ├ routes.ts                  public plan routes
   │  ├ adminRoutes.ts             staff plan routes
   │  └ plans.test.ts
   └ test/
      ├ db.ts                      createTestDb (PGlite + migrations + reset)
      ├ clock.ts                   createTestClock
      ├ sms.ts                     createRecordingSms
      ├ fixtures.ts                createCustomer
      └ context.ts                 createTestContext (app + db + call helper)
```

---

### Task 1: Repository scaffold and money helpers

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `packages/contracts/package.json`, `packages/contracts/src/index.ts`, `packages/contracts/src/errors.ts`, `packages/contracts/src/money.ts`
- Test: `packages/contracts/src/money.test.ts`

**Interfaces:**
- Produces: `rupeesToPaise(rupees: number): number`, `paiseToRupees(paise: number): number`, `formatPaise(paise: number): string`, `percentToBps(percent: number): number`, `formatBps(bps: number): string`, types `ErrorCode`, `ErrorBody`, constant `errorCodes`.

- [ ] **Step 1: Create the repo and root files**

```bash
mkdir -p /d/projects/srahira-backend/packages/contracts/src && cd /d/projects/srahira-backend && git init -b main
```

`package.json`:

```json
{
  "name": "srahira-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsup src/server.ts --format esm --target node22 --out-dir dist --clean --noExternal @nextera/contracts",
    "start": "node dist/server.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "staff:create": "tsx scripts/create-staff.ts"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src", "scripts", "packages/*/src", "drizzle.config.ts", "vitest.config.ts"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "packages/*/src/**/*.test.ts"],
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
```

`.gitignore`:

```
node_modules
dist
.env
*.tsbuildinfo
```

`packages/contracts/package.json`:

```json
{
  "name": "@nextera/contracts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "zod": "^3.25.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd /d/projects/srahira-backend
npm i hono@^4 @hono/node-server@^2 @hono/zod-validator@^0.9 drizzle-orm@^0.45 pg@^8 zod@^3.25.76 libphonenumber-js@^1 @node-rs/argon2@^2 otplib@^13
npm i -D typescript@^5 vitest@^3.2.4 tsx@^4 tsup@^8 drizzle-kit@^0.31 @electric-sql/pglite@^0.5 @types/pg@^8 @types/node@^24
```

Expected: both commands finish without `ERR!`. `node_modules/@nextera/contracts` is a symlink to `packages/contracts`.

- [ ] **Step 3: Write `packages/contracts/src/errors.ts`**

```ts
export const errorCodes = [
  "validation",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "insufficient_funds",
  "otp_invalid",
  "otp_expired",
  "otp_exhausted",
  "account_blocked",
  "account_locked",
  "sms_failed",
  "internal",
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string[]>;
    retryAfterSeconds?: number;
  };
};
```

- [ ] **Step 4: Write the failing test `packages/contracts/src/money.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  formatBps,
  formatPaise,
  paiseToRupees,
  percentToBps,
  rupeesToPaise,
} from "./money";

describe("rupeesToPaise", () => {
  it("converts whole and fractional rupees", () => {
    expect(rupeesToPaise(1350000)).toBe(135000000);
    expect(rupeesToPaise(10.5)).toBe(1050);
  });

  it("rounds away float noise", () => {
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });

  it("rejects non-finite and unsafe amounts", () => {
    expect(() => rupeesToPaise(Number.NaN)).toThrow(RangeError);
    expect(() => rupeesToPaise(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});

describe("paiseToRupees", () => {
  it("divides by one hundred", () => {
    expect(paiseToRupees(900000)).toBe(9000);
  });
});

describe("formatPaise", () => {
  it("uses Indian digit grouping without decimals for whole rupees", () => {
    expect(formatPaise(135000000)).toBe("₹13,50,000");
    expect(formatPaise(900000)).toBe("₹9,000");
  });

  it("shows two decimals when there are paise", () => {
    expect(formatPaise(900050)).toBe("₹9,000.50");
  });
});

describe("bps helpers", () => {
  it("converts percent to basis points", () => {
    expect(percentToBps(8)).toBe(800);
    expect(percentToBps(8.25)).toBe(825);
  });

  it("formats basis points as a trimmed percentage", () => {
    expect(formatBps(800)).toBe("8%");
    expect(formatBps(850)).toBe("8.5%");
    expect(formatBps(825)).toBe("8.25%");
    expect(formatBps(1000)).toBe("10%");
  });
});
```

- [ ] **Step 5: Run it and confirm it fails**

Run: `npx vitest run packages/contracts/src/money.test.ts`
Expected: FAIL, `Failed to resolve import "./money"`.

- [ ] **Step 6: Write `packages/contracts/src/money.ts`**

```ts
const wholeRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const withPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new RangeError("Amount must be a finite number");
  const paise = Math.round(rupees * 100);
  if (!Number.isSafeInteger(paise)) throw new RangeError("Amount is too large");
  return paise;
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatPaise(paise: number): string {
  const formatter = paise % 100 === 0 ? wholeRupees : withPaise;
  return formatter.format(paise / 100);
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}
```

- [ ] **Step 7: Write `packages/contracts/src/index.ts`**

```ts
export * from "./errors";
export * from "./money";
```

- [ ] **Step 8: Run the test and typecheck**

Run: `npx vitest run packages/contracts/src/money.test.ts && npm run typecheck`
Expected: all tests PASS, `tsc` prints nothing.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold srahira-backend with contracts money helpers"
```

---

### Task 2: Return schedule math

**Files:**
- Create: `packages/contracts/src/schedule.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/schedule.test.ts`

**Interfaces:**
- Produces:
  - `type ScheduleInput = { principalPaise: number; rateBps: number; tenureMonths: number; startDate: string }`. `startDate` is ISO `YYYY-MM-DD`.
  - `type SchedulePeriod = { periodNo: number; dueDate: string; grossPaise: number; cumulativePaise: number }`
  - `type ReturnsSummary = { monthlyPaise: number; totalReturnPaise: number; maturityValuePaise: number; maturityDate: string }`
  - `monthlyReturnPaise(principalPaise: number, rateBps: number): number`
  - `addMonthsClamped(isoDate: string, months: number): string`
  - `projectSchedule(input: ScheduleInput): SchedulePeriod[]`
  - `calculateReturns(input: ScheduleInput): ReturnsSummary`
  - `parseIsoDate(value: string): { year: number; month: number; day: number }`

- [ ] **Step 1: Write the failing test `packages/contracts/src/schedule.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  addMonthsClamped,
  calculateReturns,
  monthlyReturnPaise,
  parseIsoDate,
  projectSchedule,
} from "./schedule";

describe("monthlyReturnPaise", () => {
  it("matches the agreed example of 13.5 lakh at 8% p.a.", () => {
    expect(monthlyReturnPaise(135000000, 800)).toBe(900000);
  });

  it("floors fractional paise", () => {
    expect(monthlyReturnPaise(100001, 800)).toBe(666);
  });

  it("stays exact beyond the float-safe product range", () => {
    expect(monthlyReturnPaise(1_000_000_000_000, 1200)).toBe(10_000_000_000);
  });
});

describe("addMonthsClamped", () => {
  it("adds months on the same day", () => {
    expect(addMonthsClamped("2026-10-10", 1)).toBe("2026-11-10");
    expect(addMonthsClamped("2026-10-10", 3)).toBe("2027-01-10");
  });

  it("clamps to the last day of shorter months", () => {
    expect(addMonthsClamped("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsClamped("2027-01-31", 2)).toBe("2027-03-31");
    expect(addMonthsClamped("2026-08-31", 1)).toBe("2026-09-30");
  });
});

describe("parseIsoDate", () => {
  it("rejects malformed and impossible dates", () => {
    expect(() => parseIsoDate("2026-13-01")).toThrow(RangeError);
    expect(() => parseIsoDate("2027-02-29")).toThrow(RangeError);
    expect(() => parseIsoDate("10/10/2026")).toThrow(RangeError);
  });
});

describe("projectSchedule", () => {
  it("credits the same amount every month and accumulates it", () => {
    const schedule = projectSchedule({
      principalPaise: 135000000,
      rateBps: 800,
      tenureMonths: 12,
      startDate: "2026-10-10",
    });
    expect(schedule).toHaveLength(12);
    expect(schedule[0]).toEqual({
      periodNo: 1,
      dueDate: "2026-11-10",
      grossPaise: 900000,
      cumulativePaise: 900000,
    });
    expect(schedule[1]).toEqual({
      periodNo: 2,
      dueDate: "2026-12-10",
      grossPaise: 900000,
      cumulativePaise: 1800000,
    });
    expect(schedule[11]?.dueDate).toBe("2027-10-10");
    expect(schedule[11]?.cumulativePaise).toBe(10800000);
  });

  it("anchors every period to the original start day", () => {
    const dates = projectSchedule({
      principalPaise: 1000000,
      rateBps: 900,
      tenureMonths: 3,
      startDate: "2027-01-31",
    }).map((period) => period.dueDate);
    expect(dates).toEqual(["2027-02-28", "2027-03-31", "2027-04-30"]);
  });

  it("rejects invalid input", () => {
    const base = { principalPaise: 100000, rateBps: 800, tenureMonths: 12, startDate: "2026-10-10" };
    expect(() => projectSchedule({ ...base, principalPaise: 0 })).toThrow(RangeError);
    expect(() => projectSchedule({ ...base, principalPaise: 10.5 })).toThrow(RangeError);
    expect(() => projectSchedule({ ...base, rateBps: -1 })).toThrow(RangeError);
    expect(() => projectSchedule({ ...base, tenureMonths: 0 })).toThrow(RangeError);
    expect(() => projectSchedule({ ...base, startDate: "2026-02-30" })).toThrow(RangeError);
  });
});

describe("calculateReturns", () => {
  it("summarises monthly, total and maturity value", () => {
    expect(
      calculateReturns({
        principalPaise: 135000000,
        rateBps: 800,
        tenureMonths: 12,
        startDate: "2026-10-10",
      }),
    ).toEqual({
      monthlyPaise: 900000,
      totalReturnPaise: 10800000,
      maturityValuePaise: 145800000,
      maturityDate: "2027-10-10",
    });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run packages/contracts/src/schedule.test.ts`
Expected: FAIL, `Failed to resolve import "./schedule"`.

- [ ] **Step 3: Write `packages/contracts/src/schedule.ts`**

```ts
export type ScheduleInput = {
  principalPaise: number;
  rateBps: number;
  tenureMonths: number;
  startDate: string;
};

export type SchedulePeriod = {
  periodNo: number;
  dueDate: string;
  grossPaise: number;
  cumulativePaise: number;
};

export type ReturnsSummary = {
  monthlyPaise: number;
  totalReturnPaise: number;
  maturityValuePaise: number;
  maturityDate: string;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

export function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const match = ISO_DATE.exec(value);
  if (!match) throw new RangeError(`Invalid date: ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`Invalid date: ${value}`);
  }
  return { year, month, day };
}

export function addMonthsClamped(isoDate: string, months: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return `${pad(targetYear, 4)}-${pad(targetMonth, 2)}-${pad(targetDay, 2)}`;
}

export function monthlyReturnPaise(principalPaise: number, rateBps: number): number {
  return Number((BigInt(principalPaise) * BigInt(rateBps)) / 120000n);
}

function assertInput(input: ScheduleInput): void {
  if (!Number.isSafeInteger(input.principalPaise) || input.principalPaise <= 0) {
    throw new RangeError("principalPaise must be a positive integer");
  }
  if (!Number.isInteger(input.rateBps) || input.rateBps < 0) {
    throw new RangeError("rateBps must be a non-negative integer");
  }
  if (!Number.isInteger(input.tenureMonths) || input.tenureMonths < 1) {
    throw new RangeError("tenureMonths must be at least 1");
  }
  parseIsoDate(input.startDate);
}

export function projectSchedule(input: ScheduleInput): SchedulePeriod[] {
  assertInput(input);
  const monthly = monthlyReturnPaise(input.principalPaise, input.rateBps);
  return Array.from({ length: input.tenureMonths }, (_, index) => {
    const periodNo = index + 1;
    return {
      periodNo,
      dueDate: addMonthsClamped(input.startDate, periodNo),
      grossPaise: monthly,
      cumulativePaise: monthly * periodNo,
    };
  });
}

export function calculateReturns(input: ScheduleInput): ReturnsSummary {
  assertInput(input);
  const monthlyPaise = monthlyReturnPaise(input.principalPaise, input.rateBps);
  const totalReturnPaise = monthlyPaise * input.tenureMonths;
  return {
    monthlyPaise,
    totalReturnPaise,
    maturityValuePaise: input.principalPaise + totalReturnPaise,
    maturityDate: addMonthsClamped(input.startDate, input.tenureMonths),
  };
}
```

- [ ] **Step 4: Export it from `packages/contracts/src/index.ts`**

```ts
export * from "./errors";
export * from "./money";
export * from "./schedule";
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run packages/contracts && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(contracts): add simple-interest return schedule"
```

---

### Task 3: Core libraries: crypto, phone, rate limiter, SMS

**Files:**
- Create: `src/lib/crypto.ts`, `src/lib/phone.ts`, `src/lib/rateLimit.ts`, `src/lib/sms.ts`, `src/lib/pgErrors.ts`
- Test: `src/lib/crypto.test.ts`, `src/lib/phone.test.ts`, `src/lib/rateLimit.test.ts`, `src/lib/sms.test.ts`

**Interfaces:**
- Produces:
  - `sha256Hex(input: string): string`, `hmacHex(key: string, input: string): string`, `safeEqualHex(a: string, b: string): boolean`, `randomToken(bytes?: number): string`, `randomDigits(length: number): string`
  - `createCipher(keyBase64: string): Cipher` where `type Cipher = { encrypt(plain: string): string; decrypt(payload: string): string }`
  - `normalizeIndianMobile(input: string): string | null`, which returns E.164 such as `+919876543210`
  - `createRateLimiter(options: { limit: number; windowMs: number; maxKeys?: number }): RateLimiter` where `type RateLimiter = (key: string, now?: number) => { allowed: boolean; retryAfterSeconds: number }`
  - `type SmsSender = { sendOtp(phone: string, code: string): Promise<void> }`, `createConsoleSms(log?: (line: string) => void): SmsSender`, `createMsg91Sms(options: { authKey: string; templateId: string; fetchImpl?: typeof fetch }): SmsSender`
  - `isUniqueViolation(error: unknown): boolean`

- [ ] **Step 1: Write the failing tests**

`src/lib/crypto.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createCipher,
  hmacHex,
  randomDigits,
  randomToken,
  safeEqualHex,
  sha256Hex,
} from "./crypto";

const key = Buffer.alloc(32, 7).toString("base64");

describe("cipher", () => {
  it("round-trips text", () => {
    const cipher = createCipher(key);
    expect(cipher.decrypt(cipher.encrypt("ABCDE1234F"))).toBe("ABCDE1234F");
  });

  it("uses a fresh IV every time", () => {
    const cipher = createCipher(key);
    expect(cipher.encrypt("same")).not.toBe(cipher.encrypt("same"));
  });

  it("refuses tampered ciphertext", () => {
    const cipher = createCipher(key);
    const parts = cipher.encrypt("secret").split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => cipher.decrypt(parts.join("."))).toThrow();
  });

  it("refuses a key that is not 32 bytes", () => {
    expect(() => createCipher(Buffer.alloc(16).toString("base64"))).toThrow(/32 bytes/);
  });
});

describe("hashing helpers", () => {
  it("hashes deterministically", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hmacHex("k", "v")).toBe(hmacHex("k", "v"));
    expect(hmacHex("k", "v")).not.toBe(hmacHex("k2", "v"));
  });

  it("compares hex in constant time and handles length mismatch", () => {
    expect(safeEqualHex("abcd", "abcd")).toBe(true);
    expect(safeEqualHex("abcd", "abce")).toBe(false);
    expect(safeEqualHex("abcd", "abcdef")).toBe(false);
  });
});

describe("random helpers", () => {
  it("creates url-safe tokens", () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(randomToken());
  });

  it("creates digit strings of the requested length", () => {
    expect(randomDigits(6)).toMatch(/^\d{6}$/);
  });
});
```

`src/lib/phone.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeIndianMobile } from "./phone";

describe("normalizeIndianMobile", () => {
  it("accepts Indian mobiles in common formats", () => {
    expect(normalizeIndianMobile("9876543210")).toBe("+919876543210");
    expect(normalizeIndianMobile("+91 98765 43210")).toBe("+919876543210");
    expect(normalizeIndianMobile("09876543210")).toBe("+919876543210");
  });

  it("rejects landlines, foreign numbers and junk", () => {
    expect(normalizeIndianMobile("+91 11 2345 6789")).toBeNull();
    expect(normalizeIndianMobile("+14155552671")).toBeNull();
    expect(normalizeIndianMobile("12345")).toBeNull();
    expect(normalizeIndianMobile("")).toBeNull();
  });
});
```

`src/lib/rateLimit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows up to the limit then blocks with a retry hint", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60000 });
    expect(limiter("a", 0).allowed).toBe(true);
    expect(limiter("a", 1000).allowed).toBe(true);
    expect(limiter("a", 2000)).toEqual({ allowed: false, retryAfterSeconds: 58 });
  });

  it("tracks keys independently and resets after the window", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter("a", 0).allowed).toBe(true);
    expect(limiter("b", 0).allowed).toBe(true);
    expect(limiter("a", 500).allowed).toBe(false);
    expect(limiter("a", 1000).allowed).toBe(true);
  });

  it("evicts the oldest key when full", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 10000, maxKeys: 2 });
    limiter("a", 0);
    limiter("b", 1);
    limiter("c", 2);
    expect(limiter("a", 3).allowed).toBe(true);
  });
});
```

`src/lib/sms.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createConsoleSms, createMsg91Sms } from "./sms";

describe("createConsoleSms", () => {
  it("logs the code", async () => {
    const lines: string[] = [];
    await createConsoleSms((line) => lines.push(line)).sendOtp("+919876543210", "123456");
    expect(lines).toEqual(["[sms] OTP for +919876543210: 123456"]);
  });
});

describe("createMsg91Sms", () => {
  it("posts to the flow API without the plus sign", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ type: "success" }), { status: 200 });
    }) as unknown as typeof fetch;
    await createMsg91Sms({ authKey: "key", templateId: "tpl", fetchImpl }).sendOtp(
      "+919876543210",
      "123456",
    );
    expect(calls[0]?.url).toBe("https://control.msg91.com/api/v5/flow");
    expect(new Headers(calls[0]?.init.headers).get("authkey")).toBe("key");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      template_id: "tpl",
      recipients: [{ mobiles: "919876543210", otp: "123456" }],
    });
  });

  it("throws when MSG91 reports an error", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ type: "error", message: "bad" }), {
        status: 200,
      })) as unknown as typeof fetch;
    await expect(
      createMsg91Sms({ authKey: "key", templateId: "tpl", fetchImpl }).sendOtp("+919876543210", "1"),
    ).rejects.toThrow(/MSG91/);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run src/lib`
Expected: FAIL, every file reports an unresolved import.

- [ ] **Step 3: Write `src/lib/crypto.ts`**

```ts
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

export type Cipher = {
  encrypt(plain: string): string;
  decrypt(payload: string): string;
};

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function hmacHex(key: string, input: string): string {
  return createHmac("sha256", key).update(input, "utf8").digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function randomDigits(length: number): string {
  let out = "";
  for (let index = 0; index < length; index += 1) out += String(randomInt(0, 10));
  return out;
}

export function createCipher(keyBase64: string): Cipher {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) throw new Error("DATA_KEY must decode to 32 bytes");

  return {
    encrypt(plain) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      return ["v1", iv, tag, encrypted].map((part) =>
        typeof part === "string" ? part : part.toString("base64url"),
      ).join(".");
    },
    decrypt(payload) {
      const [version, iv, tag, encrypted] = payload.split(".");
      if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Unrecognised ciphertext");
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(encrypted, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    },
  };
}
```

- [ ] **Step 4: Write `src/lib/phone.ts`**

```ts
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export function normalizeIndianMobile(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input, "IN");
  if (!parsed || !parsed.isValid() || parsed.country !== "IN") return null;
  const type = parsed.getType();
  if (type !== "MOBILE" && type !== "FIXED_LINE_OR_MOBILE") return null;
  return parsed.number;
}
```

- [ ] **Step 5: Write `src/lib/rateLimit.ts`**

This is the limiter from `srahira/src/lib/rateLimit.ts` with a named `RateLimiter` type.

```ts
export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type RateLimiter = (key: string, now?: number) => RateLimitResult;

type WindowEntry = {
  windowStart: number;
  count: number;
};

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}): RateLimiter {
  const { limit, windowMs, maxKeys = 10000 } = options;
  const store = new Map<string, WindowEntry>();

  return function check(key: string, now: number = Date.now()): RateLimitResult {
    const entry = store.get(key);
    const windowStart = entry && now - entry.windowStart < windowMs ? entry.windowStart : now;
    const isNewWindow = !entry || windowStart !== entry.windowStart;
    const count = isNewWindow ? 1 : entry.count + 1;

    if (isNewWindow && !entry && store.size >= maxKeys) {
      let oldestKey: string | undefined;
      let oldestTime = Infinity;
      for (const [candidate, value] of store) {
        if (value.windowStart < oldestTime) {
          oldestTime = value.windowStart;
          oldestKey = candidate;
        }
      }
      if (oldestKey !== undefined) store.delete(oldestKey);
    }

    store.set(key, { windowStart, count });

    if (count > limit) {
      const retryAfterSeconds = Math.ceil((windowStart + windowMs - now) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 0) };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  };
}
```

- [ ] **Step 6: Write `src/lib/sms.ts`**

```ts
export type SmsSender = {
  sendOtp(phone: string, code: string): Promise<void>;
};

export function createConsoleSms(log: (line: string) => void = console.info): SmsSender {
  return {
    async sendOtp(phone, code) {
      log(`[sms] OTP for ${phone}: ${code}`);
    },
  };
}

export function createMsg91Sms(options: {
  authKey: string;
  templateId: string;
  fetchImpl?: typeof fetch;
}): SmsSender {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async sendOtp(phone, code) {
      const response = await fetchImpl("https://control.msg91.com/api/v5/flow", {
        method: "POST",
        headers: {
          authkey: options.authKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          template_id: options.templateId,
          recipients: [{ mobiles: phone.replace(/^\+/, ""), otp: code }],
        }),
        signal: AbortSignal.timeout(8000),
      });
      const body = (await response.json().catch(() => ({}))) as { type?: string; message?: string };
      if (!response.ok || body.type === "error") {
        throw new Error(`MSG91 rejected the OTP send: ${response.status} ${body.message ?? ""}`.trim());
      }
    },
  };
}
```

- [ ] **Step 7: Write `src/lib/pgErrors.ts`**

```ts
function codeOf(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  if (codeOf(error) === "23505") return true;
  const cause = typeof error === "object" && error !== null ? (error as { cause?: unknown }).cause : undefined;
  return codeOf(cause) === "23505";
}
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run src/lib && npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add crypto, phone, rate limit and SMS libraries"
```

---

### Task 4: Database schema, migrations and test database

**Files:**
- Create: `src/db/schema/customers.ts`, `src/db/schema/auth.ts`, `src/db/schema/staff.ts`, `src/db/schema/plans.ts`, `src/db/schema/ledger.ts`, `src/db/schema/audit.ts`, `src/db/schema/index.ts`, `src/db/client.ts`, `drizzle.config.ts`, `src/test/db.ts`, `src/test/fixtures.ts`, `drizzle/0000_init.sql` (generated)
- Test: `src/db/schema.test.ts`

**Interfaces:**
- Produces:
  - Tables `customers`, `otpChallenges`, `sessions`, `staff`, `plans`, `ledgerTransactions`, `ledgerEntries`, `auditLog`, exported from `src/db/schema/index.ts`
  - `type Db = PgDatabase<PgQueryResultHKT, typeof schema>`, `type Tx` (a transaction handle), `type Executor = Db | Tx`, `createDb(url: string): Db`
  - `type CustomerRow = typeof customers.$inferSelect`, `type StaffRow = typeof staff.$inferSelect`, `type PlanRow = typeof plans.$inferSelect`
  - `createTestDb(): Promise<{ db: Db; reset(): Promise<void>; close(): Promise<void> }>`
  - `createCustomer(db: Executor, overrides?: Partial<typeof customers.$inferInsert>): Promise<CustomerRow>`

- [ ] **Step 1: Write `src/db/schema/customers.ts`**

```ts
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const customerStatus = pgEnum("customer_status", ["active", "blocked", "closed"]);
export const kycStatus = pgEnum("kyc_status", ["none", "submitted", "verified", "rejected"]);
export const customerOrigin = pgEnum("customer_origin", ["self", "admin", "lead"]);

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  email: text("email"),
  status: customerStatus("status").notNull().default("active"),
  kycStatus: kycStatus("kyc_status").notNull().default("none"),
  createdVia: customerOrigin("created_via").notNull().default("self"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CustomerRow = typeof customers.$inferSelect;
```

- [ ] **Step 2: Write `src/db/schema/auth.ts`**

```ts
import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const otpPurpose = pgEnum("otp_purpose", ["login", "consent"]);
export const sessionSubject = pgEnum("session_subject", ["customer", "staff"]);

export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: uuid("id").primaryKey(),
    phone: text("phone").notNull(),
    purpose: otpPurpose("purpose").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    ip: text("ip"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("otp_challenges_phone_created_idx").on(table.phone, table.createdAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull().unique(),
    subjectType: sessionSubject("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_subject_idx").on(table.subjectType, table.subjectId)],
);
```

- [ ] **Step 3: Write `src/db/schema/staff.ts`**

```ts
import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const staffRole = pgEnum("staff_role", ["owner", "ops", "support"]);

export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  totpSecret: text("totp_secret").notNull(),
  role: staffRole("role").notNull(),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StaffRow = typeof staff.$inferSelect;
```

- [ ] **Step 4: Write `src/db/schema/plans.ts`**

```ts
import { sql } from "drizzle-orm";
import { bigint, check, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const planStatus = pgEnum("plan_status", ["draft", "active", "archived"]);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    rateBps: integer("rate_bps").notNull(),
    tenureMonths: integer("tenure_months").notNull(),
    minPaise: bigint("min_paise", { mode: "number" }).notNull(),
    maxPaise: bigint("max_paise", { mode: "number" }).notNull(),
    status: planStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("plans_rate_check", sql`${table.rateBps} > 0`),
    check("plans_tenure_check", sql`${table.tenureMonths} > 0`),
    check("plans_amounts_check", sql`${table.minPaise} > 0 and ${table.maxPaise} >= ${table.minPaise}`),
  ],
);

export type PlanRow = typeof plans.$inferSelect;
```

- [ ] **Step 5: Write `src/db/schema/ledger.ts`**

```ts
import { sql } from "drizzle-orm";
import { bigint, check, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { customers } from "./customers";

export const ledgerDirection = pgEnum("ledger_direction", ["debit", "credit"]);

export const ledgerTransactions = pgTable("ledger_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  refType: text("ref_type").notNull(),
  refId: text("ref_id").notNull(),
  memo: text("memo").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => ledgerTransactions.id),
    customerId: uuid("customer_id").references(() => customers.id),
    account: text("account").notNull(),
    direction: ledgerDirection("direction").notNull(),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ledger_entries_customer_account_idx").on(table.customerId, table.account),
    index("ledger_entries_transaction_idx").on(table.transactionId),
    check("ledger_entries_amount_check", sql`${table.amountPaise} > 0`),
  ],
);
```

- [ ] **Step 6: Write `src/db/schema/audit.ts`**

```ts
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: text("actor_type").notNull(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_log_entity_idx").on(table.entity, table.entityId)],
);
```

- [ ] **Step 7: Write `src/db/schema/index.ts` and `src/db/client.ts`**

`src/db/schema/index.ts`:

```ts
export * from "./customers";
export * from "./auth";
export * from "./staff";
export * from "./plans";
export * from "./ledger";
export * from "./audit";
```

`src/db/client.ts`:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Executor = Db | Tx;

export function createDb(url: string): Db {
  return drizzle(url, { schema });
}
```

- [ ] **Step 8: Write `drizzle.config.ts` and generate the migration**

```ts
import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile();
} catch {
  process.env.DATABASE_URL ??= "";
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
```

Run: `npx drizzle-kit generate --name init`
Expected: `drizzle/0000_init.sql` created, listing 8 tables.

- [ ] **Step 9: Write `src/test/db.ts` and `src/test/fixtures.ts`**

`src/test/db.ts`:

```ts
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "../db/client";
import * as schema from "../db/schema";

export type TestDb = {
  db: Db;
  reset(): Promise<void>;
  close(): Promise<void>;
};

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  const tables = Object.values(schema)
    .filter((value): value is PgTable => is(value, PgTable))
    .map((table) => `"${getTableName(table)}"`)
    .join(", ");

  return {
    db,
    async reset() {
      await db.execute(sql.raw(`truncate ${tables} restart identity cascade`));
    },
    async close() {
      await client.close();
    },
  };
}
```

`src/test/fixtures.ts`:

```ts
import type { Executor } from "../db/client";
import { customers } from "../db/schema";
import type { CustomerRow } from "../db/schema";

let sequence = 0;

export async function createCustomer(
  db: Executor,
  overrides: Partial<typeof customers.$inferInsert> = {},
): Promise<CustomerRow> {
  sequence += 1;
  const [row] = await db
    .insert(customers)
    .values({ phone: `+91987${String(sequence).padStart(7, "0")}`, ...overrides })
    .returning();
  if (!row) throw new Error("Failed to insert customer fixture");
  return row;
}
```

- [ ] **Step 10: Write the test `src/db/schema.test.ts`**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { customers, plans } from "./schema";
import { createTestDb } from "../test/db";
import type { TestDb } from "../test/db";
import { createCustomer } from "../test/fixtures";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb();
});

beforeEach(async () => {
  await testDb.reset();
});

afterAll(async () => {
  await testDb.close();
});

describe("schema", () => {
  it("creates customers with safe defaults", async () => {
    const customer = await createCustomer(testDb.db);
    expect(customer.status).toBe("active");
    expect(customer.kycStatus).toBe("none");
    expect(customer.createdVia).toBe("self");
  });

  it("enforces unique phone numbers", async () => {
    await createCustomer(testDb.db, { phone: "+919876543210" });
    await expect(createCustomer(testDb.db, { phone: "+919876543210" })).rejects.toThrow();
  });

  it("rejects a plan whose maximum is below its minimum", async () => {
    await expect(
      testDb.db.insert(plans).values({
        slug: "bad",
        name: "Bad",
        rateBps: 800,
        tenureMonths: 12,
        minPaise: 1000,
        maxPaise: 999,
      }),
    ).rejects.toThrow();
  });

  it("reset empties every table", async () => {
    await createCustomer(testDb.db);
    await testDb.reset();
    expect(await testDb.db.select().from(customers)).toHaveLength(0);
  });
});
```

- [ ] **Step 11: Run the tests**

Run: `npx vitest run src/db && npm run typecheck`
Expected: 4 tests PASS.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat(db): add core schema, migration and PGlite test database"
```

---

### Task 5: Environment, error handling, service-key gate and app shell

**Files:**
- Create: `src/env.ts`, `src/http/types.ts`, `src/http/errors.ts`, `src/http/serviceAuth.ts`, `src/app.ts`, `src/test/clock.ts`, `src/test/sms.ts`, `src/test/context.ts`
- Test: `src/env.test.ts`, `src/app.test.ts`

**Interfaces:**
- Consumes: `Db` (Task 4), `Cipher`, `createCipher`, `SmsSender`, `sha256Hex`, `safeEqualHex` (Task 3), `ErrorCode`, `ErrorBody` (Task 1).
- Produces:
  - `loadEnv(source?: NodeJS.ProcessEnv): Env`, `type Env`
  - `type Clock = () => Date`, `type ServiceName = "portal" | "admin"`
  - `type AppDeps = { db: Db; cipher: Cipher; sms: SmsSender; now: Clock; config: { otpPepper: string; portalServiceKey: string; adminServiceKey: string } }`
  - `type AppEnv = { Variables: { service: ServiceName; clientIp: string; userAgent: string; customer: CustomerRow; staff: StaffRow; sessionId: string } }`
  - `class AppError extends Error { code: ErrorCode; extra: { fields?: Record<string, string[]>; retryAfterSeconds?: number }; status: ContentfulStatusCode; toBody(): ErrorBody }`
  - `handleError(err: Error, c: Context): Response`, `onInvalid(result): void` (zValidator hook)
  - `serviceAuth(config: AppDeps["config"])` middleware, `onlyService(name: ServiceName)` middleware
  - `createApp(deps: AppDeps): Hono<AppEnv>`
  - Test helpers: `createTestClock(start: Date)` → `{ now(): Date; set(date: Date): void; advance(ms: number): void }`; `createRecordingSms()` → `SmsSender & { sent: { phone: string; code: string }[] }`; `createTestContext()` → `TestContext`, plus `PORTAL_KEY`, `ADMIN_KEY`, `TEST_START`

- [ ] **Step 1: Write the failing test `src/env.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

const valid = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/srahira",
  DATA_KEY: Buffer.alloc(32, 1).toString("base64"),
  OTP_PEPPER: "p".repeat(32),
  PORTAL_SERVICE_KEY: "s".repeat(32),
  ADMIN_SERVICE_KEY: "a".repeat(32),
};

describe("loadEnv", () => {
  it("parses a valid environment with defaults", () => {
    const env = loadEnv(valid);
    expect(env.PORT).toBe(4000);
    expect(env.SMS_PROVIDER).toBe("console");
  });

  it("names every missing variable", () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL.*DATA_KEY|DATA_KEY.*DATABASE_URL/);
  });

  it("requires MSG91 credentials when MSG91 is selected", () => {
    expect(() => loadEnv({ ...valid, SMS_PROVIDER: "msg91" })).toThrow(/MSG91_AUTH_KEY/);
  });

  it("forbids console SMS in production", () => {
    expect(() => loadEnv({ ...valid, NODE_ENV: "production" })).toThrow(/console SMS/);
  });

  it("forbids sharing one service key between apps", () => {
    expect(() => loadEnv({ ...valid, ADMIN_SERVICE_KEY: valid.PORTAL_SERVICE_KEY })).toThrow(
      /must differ/,
    );
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/env.test.ts`
Expected: FAIL, unresolved import `./env`.

- [ ] **Step 3: Write `src/env.ts`**

```ts
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().url(),
    DATA_KEY: z.string().min(40),
    OTP_PEPPER: z.string().min(32),
    PORTAL_SERVICE_KEY: z.string().min(32),
    ADMIN_SERVICE_KEY: z.string().min(32),
    SMS_PROVIDER: z.enum(["console", "msg91"]).default("console"),
    MSG91_AUTH_KEY: z.string().min(1).optional(),
    MSG91_OTP_TEMPLATE_ID: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.SMS_PROVIDER === "msg91" && (!env.MSG91_AUTH_KEY || !env.MSG91_OTP_TEMPLATE_ID)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MSG91_AUTH_KEY"],
        message: "MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID are required when SMS_PROVIDER=msg91",
      });
    }
    if (env.NODE_ENV === "production" && env.SMS_PROVIDER === "console") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMS_PROVIDER"],
        message: "console SMS is not allowed in production",
      });
    }
    if (env.PORTAL_SERVICE_KEY === env.ADMIN_SERVICE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ADMIN_SERVICE_KEY"],
        message: "PORTAL_SERVICE_KEY and ADMIN_SERVICE_KEY must differ",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv | Record<string, string> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  return result.data;
}
```

- [ ] **Step 4: Run the env test**

Run: `npx vitest run src/env.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `src/http/types.ts`**

```ts
import type { Db } from "../db/client";
import type { CustomerRow, StaffRow } from "../db/schema";
import type { Cipher } from "../lib/crypto";
import type { SmsSender } from "../lib/sms";

export type Clock = () => Date;

export type ServiceName = "portal" | "admin";

export type AppConfig = {
  otpPepper: string;
  portalServiceKey: string;
  adminServiceKey: string;
};

export type AppDeps = {
  db: Db;
  cipher: Cipher;
  sms: SmsSender;
  now: Clock;
  config: AppConfig;
};

export type AppEnv = {
  Variables: {
    service: ServiceName;
    clientIp: string;
    userAgent: string;
    customer: CustomerRow;
    staff: StaffRow;
    sessionId: string;
  };
};
```

- [ ] **Step 6: Write `src/http/errors.ts`**

```ts
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorBody, ErrorCode } from "@nextera/contracts";

const statusByCode: Record<ErrorCode, ContentfulStatusCode> = {
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  insufficient_funds: 422,
  otp_invalid: 400,
  otp_expired: 400,
  otp_exhausted: 429,
  account_blocked: 403,
  account_locked: 423,
  sms_failed: 502,
  internal: 500,
};

type ErrorExtra = {
  fields?: Record<string, string[]>;
  retryAfterSeconds?: number;
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly extra: ErrorExtra;

  constructor(code: ErrorCode, message: string, extra: ErrorExtra = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.extra = extra;
  }

  get status(): ContentfulStatusCode {
    return statusByCode[this.code];
  }

  toBody(): ErrorBody {
    return { error: { code: this.code, message: this.message, ...this.extra } };
  }
}

type Issues = {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
};

export function fieldsFromIssues(error: Issues): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

export function onInvalid(result: { success: boolean; error?: Issues }): void {
  if (!result.success && result.error) {
    throw new AppError("validation", "Some fields are invalid", {
      fields: fieldsFromIssues(result.error),
    });
  }
}

export function handleError(err: Error, c: Context): Response {
  if (err instanceof AppError) {
    if (err.extra.retryAfterSeconds !== undefined) {
      c.header("Retry-After", String(err.extra.retryAfterSeconds));
    }
    return c.json(err.toBody(), err.status);
  }
  if (err instanceof HTTPException && err.status < 500) {
    const body: ErrorBody = { error: { code: "validation", message: err.message } };
    return c.json(body, err.status);
  }
  console.error("[unhandled]", err);
  const body: ErrorBody = { error: { code: "internal", message: "Something went wrong" } };
  return c.json(body, 500);
}
```

- [ ] **Step 7: Write `src/http/serviceAuth.ts`**

```ts
import { createMiddleware } from "hono/factory";
import { safeEqualHex, sha256Hex } from "../lib/crypto";
import { AppError } from "./errors";
import type { AppConfig, AppEnv, ServiceName } from "./types";

function matchService(presented: string, config: AppConfig): ServiceName | null {
  const digest = sha256Hex(presented);
  if (safeEqualHex(digest, sha256Hex(config.portalServiceKey))) return "portal";
  if (safeEqualHex(digest, sha256Hex(config.adminServiceKey))) return "admin";
  return null;
}

function firstForwardedIp(header: string | undefined): string | null {
  const first = header?.split(",")[0]?.trim();
  return first ? first : null;
}

export function serviceAuth(config: AppConfig) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const service = matchService(c.req.header("x-service-key") ?? "", config);
    if (!service) throw new AppError("unauthorized", "Missing or invalid service key");
    c.set("service", service);
    c.set("clientIp", firstForwardedIp(c.req.header("x-forwarded-for")) ?? "unknown");
    c.set("userAgent", c.req.header("x-client-user-agent") ?? "");
    await next();
  });
}

export function onlyService(name: ServiceName) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (c.get("service") !== name) {
      throw new AppError("forbidden", `This endpoint is only available to the ${name} app`);
    }
    await next();
  });
}
```

- [ ] **Step 8: Write `src/app.ts`**

```ts
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { ErrorBody } from "@nextera/contracts";
import { handleError } from "./http/errors";
import { serviceAuth } from "./http/serviceAuth";
import type { AppDeps, AppEnv } from "./http/types";

export function createApp(deps: AppDeps): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.onError(handleError);
  app.notFound((c) => {
    const body: ErrorBody = { error: { code: "not_found", message: "Not found" } };
    return c.json(body, 404);
  });
  app.use(
    "*",
    bodyLimit({
      maxSize: 64 * 1024,
      onError: (c) => {
        const body: ErrorBody = { error: { code: "validation", message: "Request body is too large" } };
        return c.json(body, 413);
      },
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  const v1 = new Hono<AppEnv>();
  v1.use("*", serviceAuth(deps.config));
  v1.get("/ping", (c) => c.json({ service: c.get("service"), ip: c.get("clientIp") }));

  app.route("/v1", v1);
  return app;
}
```

Every later task adds its `v1.route(...)` lines **above** `app.route("/v1", v1);`, because Hono copies routes when `app.route` is called.

- [ ] **Step 9: Write the test helpers**

`src/test/clock.ts`:

```ts
export type TestClock = {
  now(): Date;
  set(date: Date): void;
  advance(ms: number): void;
};

export function createTestClock(start: Date): TestClock {
  let current = new Date(start);
  return {
    now: () => new Date(current),
    set(date) {
      current = new Date(date);
    },
    advance(ms) {
      current = new Date(current.getTime() + ms);
    },
  };
}
```

`src/test/sms.ts`:

```ts
import type { SmsSender } from "../lib/sms";

export type RecordingSms = SmsSender & {
  sent: { phone: string; code: string }[];
  fail: boolean;
  lastCode(): string;
};

export function createRecordingSms(): RecordingSms {
  const sms: RecordingSms = {
    sent: [],
    fail: false,
    async sendOtp(phone, code) {
      if (sms.fail) throw new Error("SMS provider down");
      sms.sent.push({ phone, code });
    },
    lastCode() {
      const last = sms.sent.at(-1);
      if (!last) throw new Error("No SMS sent");
      return last.code;
    },
  };
  return sms;
}
```

`src/test/context.ts`:

```ts
import { createApp } from "../app";
import type { Db } from "../db/client";
import type { AppDeps } from "../http/types";
import { createCipher } from "../lib/crypto";
import { createTestClock } from "./clock";
import type { TestClock } from "./clock";
import { createTestDb } from "./db";
import { createRecordingSms } from "./sms";
import type { RecordingSms } from "./sms";

export const PORTAL_KEY = "portal-".padEnd(40, "p");
export const ADMIN_KEY = "admin-".padEnd(40, "a");
export const TEST_START = new Date("2026-10-10T06:00:00.000Z");

type CallOptions = {
  method?: string;
  service?: "portal" | "admin" | "none";
  token?: string;
  json?: unknown;
  ip?: string;
};

export type TestContext = {
  db: Db;
  deps: AppDeps;
  sms: RecordingSms;
  clock: TestClock;
  call(path: string, options?: CallOptions): Promise<Response>;
  reset(): Promise<void>;
  close(): Promise<void>;
};

export async function createTestContext(): Promise<TestContext> {
  const testDb = await createTestDb();
  const sms = createRecordingSms();
  const clock = createTestClock(TEST_START);
  const deps: AppDeps = {
    db: testDb.db,
    cipher: createCipher(Buffer.alloc(32, 7).toString("base64")),
    sms,
    now: () => clock.now(),
    config: {
      otpPepper: "pepper-".padEnd(40, "x"),
      portalServiceKey: PORTAL_KEY,
      adminServiceKey: ADMIN_KEY,
    },
  };
  let app = createApp(deps);

  return {
    db: testDb.db,
    deps,
    sms,
    clock,
    async call(path, options = {}) {
      const headers = new Headers();
      const service = options.service ?? "portal";
      if (service !== "none") headers.set("x-service-key", service === "portal" ? PORTAL_KEY : ADMIN_KEY);
      if (options.token) headers.set("authorization", `Bearer ${options.token}`);
      if (options.ip) headers.set("x-forwarded-for", options.ip);
      if (options.json !== undefined) headers.set("content-type", "application/json");
      return app.request(path, {
        method: options.method ?? (options.json === undefined ? "GET" : "POST"),
        headers,
        body: options.json === undefined ? undefined : JSON.stringify(options.json),
      });
    },
    async reset() {
      await testDb.reset();
      sms.sent.length = 0;
      sms.fail = false;
      clock.set(TEST_START);
      app = createApp(deps);
    },
    close: () => testDb.close(),
  };
}
```

- [ ] **Step 10: Write the failing test `src/app.test.ts`**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestContext } from "./test/context";
import type { TestContext } from "./test/context";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext();
});

beforeEach(async () => {
  await ctx.reset();
});

afterAll(async () => {
  await ctx.close();
});

describe("app shell", () => {
  it("serves health without a service key", async () => {
    const res = await ctx.call("/health", { service: "none" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects v1 calls without a valid service key", async () => {
    const res = await ctx.call("/v1/ping", { service: "none" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "unauthorized", message: "Missing or invalid service key" },
    });
  });

  it("identifies the calling app and the forwarded client IP", async () => {
    const res = await ctx.call("/v1/ping", { service: "admin", ip: "203.0.113.9, 10.0.0.1" });
    expect(await res.json()).toEqual({ service: "admin", ip: "203.0.113.9" });
  });

  it("returns JSON 404s", async () => {
    const res = await ctx.call("/v1/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found", message: "Not found" } });
  });
});
```

- [ ] **Step 11: Run the tests**

Run: `npx vitest run src/app.test.ts src/env.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add app shell with env validation, errors and service-key gate"
```

---

### Task 6: Double-entry ledger

**Files:**
- Create: `src/ledger/accounts.ts`, `src/ledger/post.ts`, `src/ledger/balance.ts`
- Test: `src/ledger/ledger.test.ts`

**Interfaces:**
- Consumes: `Db`, `Tx`, `Executor` (Task 4), `ledgerTransactions`, `ledgerEntries` (Task 4), `AppError` (Task 5), `createCustomer`, `createTestDb` (Task 4).
- Produces:
  - `customerAccounts = { wallet: "wallet", withdrawalHold: "withdrawal_hold" }`, `principalAccount(investmentId: string): string`, `platformAccounts = { cashIn, returnsExpense, tdsPayable, cashOut, adjustments }`, `isPlatformAccount(account: string): boolean`
  - `type LedgerLeg = { account: string; customerId: string | null; direction: "debit" | "credit"; amountPaise: number }`
  - `type Posting = { idempotencyKey: string; refType: string; refId: string; memo?: string; legs: LedgerLeg[] }`
  - `type PostResult = { transactionId: string; created: boolean }`
  - `postWithin(tx: Tx, posting: Posting): Promise<PostResult>`, which must run inside a caller's transaction
  - `postTransaction(db: Db, posting: Posting): Promise<PostResult>`
  - `accountBalance(db: Executor, customerId: string, account: string): Promise<number>`, credit-normal: credits minus debits
  - `customerBalances(db: Executor, customerId: string): Promise<Record<string, number>>`

- [ ] **Step 1: Write the failing test `src/ledger/ledger.test.ts`**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { ledgerEntries, ledgerTransactions } from "../db/schema";
import type { CustomerRow } from "../db/schema";
import { AppError } from "../http/errors";
import { createTestDb } from "../test/db";
import type { TestDb } from "../test/db";
import { createCustomer } from "../test/fixtures";
import { customerAccounts, platformAccounts, principalAccount } from "./accounts";
import { accountBalance, customerBalances } from "./balance";
import { postTransaction } from "./post";
import type { Posting } from "./post";

let testDb: TestDb;
let customer: CustomerRow;

beforeAll(async () => {
  testDb = await createTestDb();
});

beforeEach(async () => {
  await testDb.reset();
  customer = await createCustomer(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

function fundWallet(key: string, amountPaise: number): Posting {
  return {
    idempotencyKey: key,
    refType: "test",
    refId: key,
    legs: [
      { account: platformAccounts.adjustments, customerId: null, direction: "debit", amountPaise },
      { account: customerAccounts.wallet, customerId: customer.id, direction: "credit", amountPaise },
    ],
  };
}

function holdFromWallet(key: string, amountPaise: number): Posting {
  return {
    idempotencyKey: key,
    refType: "test",
    refId: key,
    legs: [
      { account: customerAccounts.wallet, customerId: customer.id, direction: "debit", amountPaise },
      { account: customerAccounts.withdrawalHold, customerId: customer.id, direction: "credit", amountPaise },
    ],
  };
}

async function transactionCount(): Promise<number> {
  const rows = await testDb.db.select().from(ledgerTransactions);
  return rows.length;
}

describe("postTransaction", () => {
  it("posts balanced legs and updates balances", async () => {
    const result = await postTransaction(testDb.db, fundWallet("fund-1", 100000));
    expect(result.created).toBe(true);
    expect(await accountBalance(testDb.db, customer.id, customerAccounts.wallet)).toBe(100000);
  });

  it("rejects unbalanced postings and writes nothing", async () => {
    const posting = fundWallet("bad", 100000);
    posting.legs[1] = { ...posting.legs[1]!, amountPaise: 99999 };
    await expect(postTransaction(testDb.db, posting)).rejects.toThrow(/unbalanced/);
    expect(await transactionCount()).toBe(0);
  });

  it("rejects malformed legs", async () => {
    const platformWithCustomer = fundWallet("p", 100);
    platformWithCustomer.legs[0] = { ...platformWithCustomer.legs[0]!, customerId: customer.id };
    await expect(postTransaction(testDb.db, platformWithCustomer)).rejects.toThrow(/platform account/);

    const customerWithoutId = fundWallet("c", 100);
    customerWithoutId.legs[1] = { ...customerWithoutId.legs[1]!, customerId: null };
    await expect(postTransaction(testDb.db, customerWithoutId)).rejects.toThrow(/customer account/);

    const fractional = fundWallet("f", 100);
    fractional.legs = fractional.legs.map((leg) => ({ ...leg, amountPaise: 10.5 }));
    await expect(postTransaction(testDb.db, fractional)).rejects.toThrow(/positive integer/);
  });

  it("is idempotent on the idempotency key", async () => {
    const first = await postTransaction(testDb.db, fundWallet("same", 5000));
    const second = await postTransaction(testDb.db, fundWallet("same", 5000));
    expect(second).toEqual({ transactionId: first.transactionId, created: false });
    expect(await accountBalance(testDb.db, customer.id, customerAccounts.wallet)).toBe(5000);
  });

  it("refuses to overdraw a customer account and rolls back", async () => {
    await postTransaction(testDb.db, fundWallet("fund", 1000));
    const attempt = postTransaction(testDb.db, holdFromWallet("hold", 1500));
    await expect(attempt).rejects.toBeInstanceOf(AppError);
    await expect(attempt).rejects.toMatchObject({ code: "insufficient_funds" });
    expect(await transactionCount()).toBe(1);
    expect(await accountBalance(testDb.db, customer.id, customerAccounts.wallet)).toBe(1000);
  });

  it("lets only one of two competing debits through", async () => {
    await postTransaction(testDb.db, fundWallet("fund", 1000));
    const results = await Promise.allSettled([
      postTransaction(testDb.db, holdFromWallet("a", 700)),
      postTransaction(testDb.db, holdFromWallet("b", 700)),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await accountBalance(testDb.db, customer.id, customerAccounts.wallet)).toBe(300);
  });

  it("keeps the whole ledger summing to zero", async () => {
    await postTransaction(testDb.db, fundWallet("fund", 1000));
    await postTransaction(testDb.db, holdFromWallet("hold", 400));
    const [row] = await testDb.db
      .select({
        net: sql<number>`coalesce(sum(case when ${ledgerEntries.direction} = 'credit' then ${ledgerEntries.amountPaise} else -${ledgerEntries.amountPaise} end), 0)`.mapWith(Number),
      })
      .from(ledgerEntries);
    expect(row?.net).toBe(0);
  });
});

describe("customerBalances", () => {
  it("returns every account the customer holds", async () => {
    await postTransaction(testDb.db, fundWallet("fund", 1000));
    await postTransaction(testDb.db, holdFromWallet("hold", 400));
    expect(await customerBalances(testDb.db, customer.id)).toEqual({
      wallet: 600,
      withdrawal_hold: 400,
    });
  });

  it("names principal accounts by investment", () => {
    expect(principalAccount("abc")).toBe("principal:abc");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/ledger`
Expected: FAIL, unresolved imports.

- [ ] **Step 3: Write `src/ledger/accounts.ts`**

```ts
export const customerAccounts = {
  wallet: "wallet",
  withdrawalHold: "withdrawal_hold",
} as const;

export const platformAccounts = {
  cashIn: "platform:cash_in",
  returnsExpense: "platform:returns_expense",
  tdsPayable: "platform:tds_payable",
  cashOut: "platform:cash_out",
  adjustments: "platform:adjustments",
} as const;

export function principalAccount(investmentId: string): string {
  return `principal:${investmentId}`;
}

export function isPlatformAccount(account: string): boolean {
  return account.startsWith("platform:");
}
```

- [ ] **Step 4: Write `src/ledger/balance.ts`**

```ts
import { and, eq, sql } from "drizzle-orm";
import type { Executor } from "../db/client";
import { ledgerEntries } from "../db/schema";

const signedSum = sql<number>`coalesce(sum(case when ${ledgerEntries.direction} = 'credit' then ${ledgerEntries.amountPaise} else -${ledgerEntries.amountPaise} end), 0)`.mapWith(Number);

export async function accountBalance(
  db: Executor,
  customerId: string,
  account: string,
): Promise<number> {
  const [row] = await db
    .select({ balance: signedSum })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.customerId, customerId), eq(ledgerEntries.account, account)));
  return row?.balance ?? 0;
}

export async function customerBalances(
  db: Executor,
  customerId: string,
): Promise<Record<string, number>> {
  const rows = await db
    .select({ account: ledgerEntries.account, balance: signedSum })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.customerId, customerId))
    .groupBy(ledgerEntries.account);
  return Object.fromEntries(rows.map((row) => [row.account, row.balance]));
}
```

- [ ] **Step 5: Write `src/ledger/post.ts`**

```ts
import { eq, sql } from "drizzle-orm";
import type { Db, Tx } from "../db/client";
import { ledgerEntries, ledgerTransactions } from "../db/schema";
import { AppError } from "../http/errors";
import { isPlatformAccount } from "./accounts";
import { accountBalance } from "./balance";

export type LedgerLeg = {
  account: string;
  customerId: string | null;
  direction: "debit" | "credit";
  amountPaise: number;
};

export type Posting = {
  idempotencyKey: string;
  refType: string;
  refId: string;
  memo?: string;
  legs: LedgerLeg[];
};

export type PostResult = {
  transactionId: string;
  created: boolean;
};

function validatePosting(posting: Posting): void {
  if (!posting.idempotencyKey) throw new Error("Ledger posting needs an idempotency key");
  if (posting.legs.length < 2) throw new Error("Ledger posting needs at least two legs");
  let debits = 0;
  let credits = 0;
  for (const leg of posting.legs) {
    if (!Number.isSafeInteger(leg.amountPaise) || leg.amountPaise <= 0) {
      throw new Error(`Ledger amount must be a positive integer: ${leg.amountPaise}`);
    }
    if (isPlatformAccount(leg.account) && leg.customerId !== null) {
      throw new Error(`A platform account cannot belong to a customer: ${leg.account}`);
    }
    if (!isPlatformAccount(leg.account) && leg.customerId === null) {
      throw new Error(`A customer account needs a customer: ${leg.account}`);
    }
    if (leg.direction === "debit") debits += leg.amountPaise;
    else credits += leg.amountPaise;
  }
  if (debits !== credits) {
    throw new Error(`Ledger posting is unbalanced: debits ${debits}, credits ${credits}`);
  }
}

export async function postWithin(tx: Tx, posting: Posting): Promise<PostResult> {
  validatePosting(posting);

  const customerIds = [
    ...new Set(
      posting.legs.map((leg) => leg.customerId).filter((id): id is string => id !== null),
    ),
  ].sort();
  for (const customerId of customerIds) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${customerId}))`);
  }

  const [inserted] = await tx
    .insert(ledgerTransactions)
    .values({
      idempotencyKey: posting.idempotencyKey,
      refType: posting.refType,
      refId: posting.refId,
      memo: posting.memo ?? "",
    })
    .onConflictDoNothing({ target: ledgerTransactions.idempotencyKey })
    .returning({ id: ledgerTransactions.id });

  if (!inserted) {
    const [existing] = await tx
      .select({ id: ledgerTransactions.id })
      .from(ledgerTransactions)
      .where(eq(ledgerTransactions.idempotencyKey, posting.idempotencyKey));
    if (!existing) throw new Error("Ledger transaction conflict without an existing row");
    return { transactionId: existing.id, created: false };
  }

  await tx.insert(ledgerEntries).values(
    posting.legs.map((leg) => ({
      transactionId: inserted.id,
      customerId: leg.customerId,
      account: leg.account,
      direction: leg.direction,
      amountPaise: leg.amountPaise,
    })),
  );

  const touched = new Set(
    posting.legs
      .filter((leg) => leg.customerId !== null)
      .map((leg) => `${leg.customerId}\u0000${leg.account}`),
  );
  for (const key of touched) {
    const [customerId, account] = key.split("\u0000") as [string, string];
    if ((await accountBalance(tx, customerId, account)) < 0) {
      throw new AppError("insufficient_funds", "Insufficient balance for this operation");
    }
  }

  return { transactionId: inserted.id, created: true };
}

export async function postTransaction(db: Db, posting: Posting): Promise<PostResult> {
  return db.transaction((tx) => postWithin(tx, posting));
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/ledger && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ledger): add idempotent double-entry posting with overdraft guard"
```

---

### Task 7: OTP service

**Files:**
- Create: `src/auth/otp.ts`
- Test: `src/auth/otp.test.ts`

**Interfaces:**
- Consumes: `Db` (Task 4), `otpChallenges` (Task 4), `SmsSender`, `createRateLimiter`, `hmacHex`, `safeEqualHex`, `randomDigits` (Task 3), `AppError`, `Clock` (Task 5).
- Produces:
  - Constants `OTP_TTL_MS = 300000`, `OTP_MAX_ATTEMPTS = 5`, `OTP_PHONE_LIMIT = 3`, `OTP_PHONE_WINDOW_MS = 600000`, `OTP_IP_LIMIT = 20`, `OTP_IP_WINDOW_MS = 3600000`
  - `type OtpPurpose = "login" | "consent"`
  - `createOtpService(deps: { db: Db; sms: SmsSender; now: Clock; pepper: string }): OtpService`
  - `type OtpService = { issue(input: { phone: string; purpose: OtpPurpose; ip: string }): Promise<{ challengeId: string; expiresAt: Date }>; verify(input: { challengeId: string; code: string; purpose: OtpPurpose }): Promise<{ phone: string; challengeId: string }> }`

- [ ] **Step 1: Write the failing test `src/auth/otp.test.ts`**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { otpChallenges } from "../db/schema";
import { createTestClock } from "../test/clock";
import type { TestClock } from "../test/clock";
import { createTestDb } from "../test/db";
import type { TestDb } from "../test/db";
import { createRecordingSms } from "../test/sms";
import type { RecordingSms } from "../test/sms";
import { OTP_PHONE_WINDOW_MS, OTP_TTL_MS, createOtpService } from "./otp";
import type { OtpService } from "./otp";

const phone = "+919876543210";
let testDb: TestDb;
let sms: RecordingSms;
let clock: TestClock;
let otp: OtpService;

beforeAll(async () => {
  testDb = await createTestDb();
});

beforeEach(async () => {
  await testDb.reset();
  sms = createRecordingSms();
  clock = createTestClock(new Date("2026-10-10T06:00:00.000Z"));
  otp = createOtpService({ db: testDb.db, sms, now: () => clock.now(), pepper: "pepper".padEnd(32, "x") });
});

afterAll(async () => {
  await testDb.close();
});

describe("issue", () => {
  it("sends a 6-digit code and stores only its hash", async () => {
    const { challengeId, expiresAt } = await otp.issue({ phone, purpose: "login", ip: "1.1.1.1" });
    const code = sms.lastCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(sms.sent[0]?.phone).toBe(phone);
    expect(expiresAt.getTime() - clock.now().getTime()).toBe(OTP_TTL_MS);
    const [row] = await testDb.db.select().from(otpChallenges).where(eq(otpChallenges.id, challengeId));
    expect(row?.codeHash).not.toContain(code);
    expect(row?.ip).toBe("1.1.1.1");
  });

  it("allows three sends per phone per ten minutes", async () => {
    for (let index = 0; index < 3; index += 1) {
      await otp.issue({ phone, purpose: "login", ip: "1.1.1.1" });
      clock.advance(1000);
    }
    await expect(otp.issue({ phone, purpose: "login", ip: "1.1.1.1" })).rejects.toMatchObject({
      code: "rate_limited",
      extra: { retryAfterSeconds: 597 },
    });
    clock.advance(OTP_PHONE_WINDOW_MS);
    await expect(otp.issue({ phone, purpose: "login", ip: "1.1.1.1" })).resolves.toBeDefined();
  });

  it("allows twenty sends per IP per hour", async () => {
    for (let index = 0; index < 20; index += 1) {
      await otp.issue({ phone: `+9198765${String(index).padStart(5, "0")}`, purpose: "login", ip: "9.9.9.9" });
    }
    await expect(otp.issue({ phone, purpose: "login", ip: "9.9.9.9" })).rejects.toMatchObject({
      code: "rate_limited",
    });
  });

  it("reports SMS failures as sms_failed", async () => {
    sms.fail = true;
    await expect(otp.issue({ phone, purpose: "login", ip: "1.1.1.1" })).rejects.toMatchObject({
      code: "sms_failed",
    });
  });
});

describe("verify", () => {
  it("accepts the right code once", async () => {
    const { challengeId } = await otp.issue({ phone, purpose: "login", ip: "1.1.1.1" });
    const code = sms.lastCode();
    await expect(otp.verify({ challengeId, code, purpose: "login" })).resolves.toEqual({ phone, challengeId });
    await expect(otp.verify({ challengeId, code, purpose: "login" })).rejects.toMatchObject({
      code: "otp_invalid",
    });
  });

  it("counts wrong attempts and locks the challenge after five", async () => {
    const { challengeId } = await otp.issue({ phone, purpose: "login", ip: "1.1.1.1" });
    const code = sms.lastCode();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let index = 0; index < 5; index += 1) {
      await expect(otp.verify({ challengeId, code: wrong, purpose: "login" })).rejects.toMatchObject({
        code: "otp_invalid",
      });
    }
    await expect(otp.verify({ challengeId, code, purpose: "login" })).rejects.toMatchObject({
      code: "otp_exhausted",
    });
  });

  it("expires after five minutes", async () => {
    const { challengeId } = await otp.issue({ phone, purpose: "login", ip: "1.1.1.1" });
    clock.advance(OTP_TTL_MS);
    await expect(
      otp.verify({ challengeId, code: sms.lastCode(), purpose: "login" }),
    ).rejects.toMatchObject({ code: "otp_expired" });
  });

  it("does not accept a consent code for login", async () => {
    const { challengeId } = await otp.issue({ phone, purpose: "consent", ip: "1.1.1.1" });
    await expect(
      otp.verify({ challengeId, code: sms.lastCode(), purpose: "login" }),
    ).rejects.toMatchObject({ code: "otp_invalid" });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/auth/otp.test.ts`
Expected: FAIL, unresolved import `./otp`.

- [ ] **Step 3: Write `src/auth/otp.ts`**

```ts
import { randomUUID } from "node:crypto";
import { and, asc, eq, gte } from "drizzle-orm";
import type { Db } from "../db/client";
import { otpChallenges } from "../db/schema";
import { AppError } from "../http/errors";
import type { Clock } from "../http/types";
import { hmacHex, randomDigits, safeEqualHex } from "../lib/crypto";
import { createRateLimiter } from "../lib/rateLimit";
import type { SmsSender } from "../lib/sms";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_PHONE_LIMIT = 3;
export const OTP_PHONE_WINDOW_MS = 10 * 60 * 1000;
export const OTP_IP_LIMIT = 20;
export const OTP_IP_WINDOW_MS = 60 * 60 * 1000;

export type OtpPurpose = "login" | "consent";

export type OtpService = {
  issue(input: { phone: string; purpose: OtpPurpose; ip: string }): Promise<{ challengeId: string; expiresAt: Date }>;
  verify(input: { challengeId: string; code: string; purpose: OtpPurpose }): Promise<{ phone: string; challengeId: string }>;
};

type VerifyOutcome = { ok: true; phone: string } | { ok: false; error: AppError };

export function createOtpService(deps: {
  db: Db;
  sms: SmsSender;
  now: Clock;
  pepper: string;
}): OtpService {
  const ipLimiter = createRateLimiter({ limit: OTP_IP_LIMIT, windowMs: OTP_IP_WINDOW_MS });

  function hashCode(challengeId: string, code: string): string {
    return hmacHex(deps.pepper, `${challengeId}:${code}`);
  }

  return {
    async issue({ phone, purpose, ip }) {
      const now = deps.now();
      const ipCheck = ipLimiter(ip, now.getTime());
      if (!ipCheck.allowed) {
        throw new AppError("rate_limited", "Too many code requests from this connection. Try again later.", {
          retryAfterSeconds: ipCheck.retryAfterSeconds,
        });
      }

      const windowStart = new Date(now.getTime() - OTP_PHONE_WINDOW_MS);
      const recent = await deps.db
        .select({ createdAt: otpChallenges.createdAt })
        .from(otpChallenges)
        .where(and(eq(otpChallenges.phone, phone), gte(otpChallenges.createdAt, windowStart)))
        .orderBy(asc(otpChallenges.createdAt));
      const oldest = recent[0];
      if (recent.length >= OTP_PHONE_LIMIT && oldest) {
        const retryAfterSeconds = Math.ceil(
          (oldest.createdAt.getTime() + OTP_PHONE_WINDOW_MS - now.getTime()) / 1000,
        );
        throw new AppError("rate_limited", "Too many codes sent to this number. Try again later.", {
          retryAfterSeconds,
        });
      }

      const challengeId = randomUUID();
      const code = randomDigits(6);
      const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
      await deps.db.insert(otpChallenges).values({
        id: challengeId,
        phone,
        purpose,
        codeHash: hashCode(challengeId, code),
        ip,
        expiresAt,
        createdAt: now,
      });

      try {
        await deps.sms.sendOtp(phone, code);
      } catch (error) {
        console.error("[otp] SMS send failed", error);
        throw new AppError("sms_failed", "We couldn't send the code. Please try again shortly.");
      }

      return { challengeId, expiresAt };
    },

    async verify({ challengeId, code, purpose }) {
      const now = deps.now();
      const outcome = await deps.db.transaction(async (tx): Promise<VerifyOutcome> => {
        const [challenge] = await tx
          .select()
          .from(otpChallenges)
          .where(and(eq(otpChallenges.id, challengeId), eq(otpChallenges.purpose, purpose)))
          .for("update");
        if (!challenge || challenge.consumedAt) {
          return { ok: false, error: new AppError("otp_invalid", "This code is not valid. Request a new one.") };
        }
        if (challenge.expiresAt.getTime() <= now.getTime()) {
          return { ok: false, error: new AppError("otp_expired", "This code has expired. Request a new one.") };
        }
        if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
          return { ok: false, error: new AppError("otp_exhausted", "Too many wrong attempts. Request a new code.") };
        }
        const matches = safeEqualHex(hashCode(challenge.id, code), challenge.codeHash);
        await tx
          .update(otpChallenges)
          .set({ attempts: challenge.attempts + 1, consumedAt: matches ? now : null })
          .where(eq(otpChallenges.id, challenge.id));
        if (!matches) {
          return { ok: false, error: new AppError("otp_invalid", "That code is incorrect.") };
        }
        return { ok: true, phone: challenge.phone };
      });

      if (!outcome.ok) throw outcome.error;
      return { phone: outcome.phone, challengeId };
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/auth/otp.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): add rate-limited OTP challenges"
```

---

### Task 8: Sessions and auth middleware

**Files:**
- Create: `src/auth/sessions.ts`, `src/auth/middleware.ts`
- Test: `src/auth/sessions.test.ts`

**Interfaces:**
- Consumes: `Db`, `sessions`, `customers`, `staff` (Task 4), `randomToken`, `sha256Hex` (Task 3), `AppError`, `AppEnv`, `Clock` (Task 5), `type StaffRole` (from `@nextera/contracts`, created in this task).
- Produces:
  - `CUSTOMER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000`, `STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000`
  - `type SessionSubject = "customer" | "staff"`
  - `createSessionService(deps: { db: Db; now: Clock }): SessionService`
  - `type SessionService = { create(input: { subjectType: SessionSubject; subjectId: string; ip: string; userAgent: string }): Promise<{ token: string; sessionId: string; expiresAt: Date }>; resolve(token: string, subjectType: SessionSubject): Promise<{ sessionId: string; subjectId: string } | null>; revoke(sessionId: string): Promise<void> }`
  - `bearerToken(header: string | undefined): string | null`
  - `requireCustomer(deps: { db: Db; sessions: SessionService })` middleware, which sets `customer` and `sessionId`
  - `requireStaff(deps: { db: Db; sessions: SessionService }, roles: readonly StaffRole[])` middleware, which sets `staff` and `sessionId`
  - In `@nextera/contracts`: `staffRoles = ["owner", "ops", "support"] as const`, `type StaffRole`

- [ ] **Step 1: Create `packages/contracts/src/auth.ts` with the role types**

```ts
import { z } from "zod";

export const staffRoles = ["owner", "ops", "support"] as const;
export type StaffRole = (typeof staffRoles)[number];

export const customerStatuses = ["active", "blocked", "closed"] as const;
export type CustomerStatus = (typeof customerStatuses)[number];

export const kycStatuses = ["none", "submitted", "verified", "rejected"] as const;
export type KycStatus = (typeof kycStatuses)[number];

export const otpRequestSchema = z.object({
  phone: z.string().trim().min(8, "Enter your mobile number").max(20),
});

export const otpVerifySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const staffLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
  totp: z.string().regex(/^\d{6}$/, "Enter the 6-digit authenticator code"),
});

export type OtpRequest = z.infer<typeof otpRequestSchema>;
export type OtpVerify = z.infer<typeof otpVerifySchema>;
export type StaffLogin = z.infer<typeof staffLoginSchema>;

export type CustomerProfile = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: CustomerStatus;
  kycStatus: KycStatus;
};

export type StaffProfile = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
};

export type OtpChallengeResponse = {
  challengeId: string;
  expiresAt: string;
};

export type CustomerSessionResponse = {
  token: string;
  expiresAt: string;
  customer: CustomerProfile;
};

export type StaffSessionResponse = {
  token: string;
  expiresAt: string;
  staff: StaffProfile;
};
```

Add `export * from "./auth";` to `packages/contracts/src/index.ts`.

- [ ] **Step 2: Write the failing test `src/auth/sessions.test.ts`**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sessions } from "../db/schema";
import { sha256Hex } from "../lib/crypto";
import { createTestClock } from "../test/clock";
import type { TestClock } from "../test/clock";
import { createTestDb } from "../test/db";
import type { TestDb } from "../test/db";
import { createCustomer } from "../test/fixtures";
import { bearerToken } from "./middleware";
import { CUSTOMER_SESSION_TTL_MS, createSessionService } from "./sessions";
import type { SessionService } from "./sessions";

let testDb: TestDb;
let clock: TestClock;
let service: SessionService;
let customerId: string;

beforeAll(async () => {
  testDb = await createTestDb();
});

beforeEach(async () => {
  await testDb.reset();
  clock = createTestClock(new Date("2026-10-10T06:00:00.000Z"));
  service = createSessionService({ db: testDb.db, now: () => clock.now() });
  customerId = (await createCustomer(testDb.db)).id;
});

afterAll(async () => {
  await testDb.close();
});

describe("session service", () => {
  it("creates a session that resolves for the same subject type", async () => {
    const { token, sessionId, expiresAt } = await service.create({
      subjectType: "customer",
      subjectId: customerId,
      ip: "1.1.1.1",
      userAgent: "test",
    });
    expect(expiresAt.getTime() - clock.now().getTime()).toBe(CUSTOMER_SESSION_TTL_MS);
    expect(await service.resolve(token, "customer")).toEqual({ sessionId, subjectId: customerId });
    expect(await service.resolve(token, "staff")).toBeNull();
    expect(await service.resolve("not-a-token", "customer")).toBeNull();
  });

  it("stores only the token hash", async () => {
    const { token } = await service.create({ subjectType: "customer", subjectId: customerId, ip: "", userAgent: "" });
    const [row] = await testDb.db.select().from(sessions);
    expect(row?.tokenHash).toBe(sha256Hex(token));
  });

  it("stops resolving after expiry and after revocation", async () => {
    const first = await service.create({ subjectType: "customer", subjectId: customerId, ip: "", userAgent: "" });
    clock.advance(CUSTOMER_SESSION_TTL_MS);
    expect(await service.resolve(first.token, "customer")).toBeNull();

    clock.set(new Date("2026-10-10T06:00:00.000Z"));
    const second = await service.create({ subjectType: "customer", subjectId: customerId, ip: "", userAgent: "" });
    await service.revoke(second.sessionId);
    expect(await service.resolve(second.token, "customer")).toBeNull();
  });
});

describe("bearerToken", () => {
  it("extracts bearer tokens only", () => {
    expect(bearerToken("Bearer abc")).toBe("abc");
    expect(bearerToken("bearer abc")).toBe("abc");
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx vitest run src/auth/sessions.test.ts`
Expected: FAIL, unresolved imports.

- [ ] **Step 4: Write `src/auth/sessions.ts`**

```ts
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "../db/client";
import { sessions } from "../db/schema";
import type { Clock } from "../http/types";
import { randomToken, sha256Hex } from "../lib/crypto";

export const CUSTOMER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type SessionSubject = "customer" | "staff";

export type SessionService = {
  create(input: {
    subjectType: SessionSubject;
    subjectId: string;
    ip: string;
    userAgent: string;
  }): Promise<{ token: string; sessionId: string; expiresAt: Date }>;
  resolve(token: string, subjectType: SessionSubject): Promise<{ sessionId: string; subjectId: string } | null>;
  revoke(sessionId: string): Promise<void>;
};

export function createSessionService(deps: { db: Db; now: Clock }): SessionService {
  return {
    async create({ subjectType, subjectId, ip, userAgent }) {
      const now = deps.now();
      const token = randomToken();
      const ttl = subjectType === "customer" ? CUSTOMER_SESSION_TTL_MS : STAFF_SESSION_TTL_MS;
      const expiresAt = new Date(now.getTime() + ttl);
      const [row] = await deps.db
        .insert(sessions)
        .values({
          tokenHash: sha256Hex(token),
          subjectType,
          subjectId,
          ip: ip || null,
          userAgent: userAgent || null,
          expiresAt,
          createdAt: now,
        })
        .returning({ id: sessions.id });
      if (!row) throw new Error("Failed to create session");
      return { token, sessionId: row.id, expiresAt };
    },

    async resolve(token, subjectType) {
      const [row] = await deps.db
        .select({ sessionId: sessions.id, subjectId: sessions.subjectId })
        .from(sessions)
        .where(
          and(
            eq(sessions.tokenHash, sha256Hex(token)),
            eq(sessions.subjectType, subjectType),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, deps.now()),
          ),
        );
      return row ?? null;
    },

    async revoke(sessionId) {
      await deps.db.update(sessions).set({ revokedAt: deps.now() }).where(eq(sessions.id, sessionId));
    },
  };
}
```

- [ ] **Step 5: Write `src/auth/middleware.ts`**

```ts
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import type { StaffRole } from "@nextera/contracts";
import type { Db } from "../db/client";
import { customers, staff } from "../db/schema";
import { AppError } from "../http/errors";
import type { AppEnv } from "../http/types";
import type { SessionService } from "./sessions";

type AuthDeps = { db: Db; sessions: SessionService };

const expired = () => new AppError("unauthorized", "Your session has expired. Please sign in again.");

export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  return match?.[1] ?? null;
}

export function requireCustomer(deps: AuthDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = bearerToken(c.req.header("authorization"));
    if (!token) throw expired();
    const session = await deps.sessions.resolve(token, "customer");
    if (!session) throw expired();
    const [customer] = await deps.db.select().from(customers).where(eq(customers.id, session.subjectId));
    if (!customer || customer.status === "closed") throw expired();
    if (customer.status === "blocked") {
      throw new AppError("account_blocked", "This account is blocked. Please contact support.");
    }
    c.set("customer", customer);
    c.set("sessionId", session.sessionId);
    await next();
  });
}

export function requireStaff(deps: AuthDeps, roles: readonly StaffRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = bearerToken(c.req.header("authorization"));
    if (!token) throw expired();
    const session = await deps.sessions.resolve(token, "staff");
    if (!session) throw expired();
    const [member] = await deps.db.select().from(staff).where(eq(staff.id, session.subjectId));
    if (!member || member.disabledAt) throw expired();
    if (!roles.includes(member.role)) {
      throw new AppError("forbidden", "Your role does not allow this action");
    }
    c.set("staff", member);
    c.set("sessionId", session.sessionId);
    await next();
  });
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/auth/sessions.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth): add hashed bearer sessions and auth middleware"
```

---

### Task 9: Customer OTP login routes

**Files:**
- Create: `src/customers/profile.ts`, `src/auth/customerRoutes.ts`
- Modify: `src/app.ts`
- Test: `src/auth/customerRoutes.test.ts`

**Interfaces:**
- Consumes: `createOtpService`/`OtpService` (Task 7), `createSessionService`/`SessionService`, `requireCustomer` (Task 8), `normalizeIndianMobile` (Task 3), `onInvalid`, `AppError`, `onlyService` (Task 5), `otpRequestSchema`, `otpVerifySchema`, `CustomerProfile`, `OtpChallengeResponse`, `CustomerSessionResponse` (Task 8 contracts).
- Produces:
  - `findOrCreateCustomerByPhone(db: Executor, phone: string): Promise<CustomerRow>`
  - `toCustomerProfile(row: CustomerRow): CustomerProfile`
  - `createCustomerAuthRoutes(deps: { db: Db; otp: OtpService; sessions: SessionService }): Hono<AppEnv>`, mounted at `/v1/auth`:
    - `POST /otp/request {phone}` → `201 OtpChallengeResponse`
    - `POST /otp/verify {challengeId, code}` → `200 CustomerSessionResponse`
    - `POST /logout` → `204`
    - `GET /me` → `200 { customer: CustomerProfile }`
  - `createApp` now builds `sessions` and `otp` and mounts these routes.

- [ ] **Step 1: Write the failing test `src/auth/customerRoutes.test.ts`**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { CustomerSessionResponse, OtpChallengeResponse } from "@nextera/contracts";
import { customers, otpChallenges } from "../db/schema";
import { createTestContext } from "../test/context";
import type { TestContext } from "../test/context";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext();
});

beforeEach(async () => {
  await ctx.reset();
});

afterAll(async () => {
  await ctx.close();
});

async function login(phone = "98765 43210"): Promise<CustomerSessionResponse> {
  const requested = await ctx.call("/v1/auth/otp/request", { json: { phone }, ip: "203.0.113.5" });
  expect(requested.status).toBe(201);
  const { challengeId } = (await requested.json()) as OtpChallengeResponse;
  const verified = await ctx.call("/v1/auth/otp/verify", {
    json: { challengeId, code: ctx.sms.lastCode() },
  });
  expect(verified.status).toBe(200);
  return (await verified.json()) as CustomerSessionResponse;
}

describe("customer auth", () => {
  it("is only available to the portal app", async () => {
    const res = await ctx.call("/v1/auth/otp/request", { service: "admin", json: { phone: "9876543210" } });
    expect(res.status).toBe(403);
  });

  it("rejects numbers that are not Indian mobiles", async () => {
    const res = await ctx.call("/v1/auth/otp/request", { json: { phone: "+14155552671" } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "validation", fields: { phone: ["Enter a valid Indian mobile number"] } },
    });
  });

  it("rejects a malformed verify body with field errors", async () => {
    const res = await ctx.call("/v1/auth/otp/verify", { json: { challengeId: "x", code: "12" } });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { fields: Record<string, string[]> } };
    expect(Object.keys(body.error.fields).sort()).toEqual(["challengeId", "code"]);
  });

  it("signs up a new customer and records the client IP", async () => {
    const session = await login();
    expect(session.customer).toMatchObject({ phone: "+919876543210", kycStatus: "none", status: "active" });
    expect(session.token).toBeTruthy();
    const [challenge] = await ctx.db.select().from(otpChallenges);
    expect(challenge?.ip).toBe("203.0.113.5");
    const me = await ctx.call("/v1/auth/me", { token: session.token });
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({ customer: session.customer });
  });

  it("logs an existing customer back into the same account", async () => {
    const first = await login();
    const second = await login("+919876543210");
    expect(second.customer.id).toBe(first.customer.id);
    expect(await ctx.db.select().from(customers)).toHaveLength(1);
  });

  it("revokes the session on logout", async () => {
    const { token } = await login();
    const out = await ctx.call("/v1/auth/logout", { method: "POST", token });
    expect(out.status).toBe(204);
    expect((await ctx.call("/v1/auth/me", { token })).status).toBe(401);
  });

  it("refuses blocked customers at login and on existing sessions", async () => {
    const { token, customer } = await login();
    await ctx.db.update(customers).set({ status: "blocked" }).where(eq(customers.id, customer.id));
    const me = await ctx.call("/v1/auth/me", { token });
    expect(me.status).toBe(403);
    expect(await me.json()).toMatchObject({ error: { code: "account_blocked" } });

    const requested = await ctx.call("/v1/auth/otp/request", { json: { phone: "9876543210" } });
    const { challengeId } = (await requested.json()) as OtpChallengeResponse;
    const verified = await ctx.call("/v1/auth/otp/verify", { json: { challengeId, code: ctx.sms.lastCode() } });
    expect(verified.status).toBe(403);
  });

  it("returns 401 without a token", async () => {
    expect((await ctx.call("/v1/auth/me")).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/auth/customerRoutes.test.ts`
Expected: FAIL, the request route returns 404.

- [ ] **Step 3: Write `src/customers/profile.ts`**

```ts
import { eq } from "drizzle-orm";
import type { CustomerProfile } from "@nextera/contracts";
import type { Executor } from "../db/client";
import { customers } from "../db/schema";
import type { CustomerRow } from "../db/schema";

export async function findOrCreateCustomerByPhone(db: Executor, phone: string): Promise<CustomerRow> {
  const [created] = await db
    .insert(customers)
    .values({ phone, createdVia: "self" })
    .onConflictDoNothing({ target: customers.phone })
    .returning();
  if (created) return created;
  const [existing] = await db.select().from(customers).where(eq(customers.phone, phone));
  if (!existing) throw new Error("Customer vanished after phone conflict");
  return existing;
}

export function toCustomerProfile(row: CustomerRow): CustomerProfile {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    email: row.email,
    status: row.status,
    kycStatus: row.kycStatus,
  };
}
```

- [ ] **Step 4: Write `src/auth/customerRoutes.ts`**

```ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { otpRequestSchema, otpVerifySchema } from "@nextera/contracts";
import type { CustomerSessionResponse, OtpChallengeResponse } from "@nextera/contracts";
import type { Db } from "../db/client";
import { findOrCreateCustomerByPhone, toCustomerProfile } from "../customers/profile";
import { AppError, onInvalid } from "../http/errors";
import { onlyService } from "../http/serviceAuth";
import type { AppEnv } from "../http/types";
import { normalizeIndianMobile } from "../lib/phone";
import { requireCustomer } from "./middleware";
import type { OtpService } from "./otp";
import type { SessionService } from "./sessions";

export function createCustomerAuthRoutes(deps: {
  db: Db;
  otp: OtpService;
  sessions: SessionService;
}): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  const signedIn = requireCustomer(deps);

  routes.use("*", onlyService("portal"));

  routes.post("/otp/request", zValidator("json", otpRequestSchema, onInvalid), async (c) => {
    const phone = normalizeIndianMobile(c.req.valid("json").phone);
    if (!phone) {
      const message = "Enter a valid Indian mobile number";
      throw new AppError("validation", message, { fields: { phone: [message] } });
    }
    const challenge = await deps.otp.issue({ phone, purpose: "login", ip: c.get("clientIp") });
    const body: OtpChallengeResponse = {
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt.toISOString(),
    };
    return c.json(body, 201);
  });

  routes.post("/otp/verify", zValidator("json", otpVerifySchema, onInvalid), async (c) => {
    const { challengeId, code } = c.req.valid("json");
    const { phone } = await deps.otp.verify({ challengeId, code, purpose: "login" });
    const customer = await findOrCreateCustomerByPhone(deps.db, phone);
    if (customer.status !== "active") {
      throw new AppError("account_blocked", "This account is not active. Please contact support.");
    }
    const session = await deps.sessions.create({
      subjectType: "customer",
      subjectId: customer.id,
      ip: c.get("clientIp"),
      userAgent: c.get("userAgent"),
    });
    const body: CustomerSessionResponse = {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      customer: toCustomerProfile(customer),
    };
    return c.json(body);
  });

  routes.post("/logout", signedIn, async (c) => {
    await deps.sessions.revoke(c.get("sessionId"));
    return c.body(null, 204);
  });

  routes.get("/me", signedIn, (c) => c.json({ customer: toCustomerProfile(c.get("customer")) }));

  return routes;
}
```

- [ ] **Step 5: Mount the routes in `src/app.ts`**

Replace the whole file with:

```ts
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { ErrorBody } from "@nextera/contracts";
import { createCustomerAuthRoutes } from "./auth/customerRoutes";
import { createOtpService } from "./auth/otp";
import { createSessionService } from "./auth/sessions";
import { handleError } from "./http/errors";
import { serviceAuth } from "./http/serviceAuth";
import type { AppDeps, AppEnv } from "./http/types";

export function createApp(deps: AppDeps): Hono<AppEnv> {
  const sessions = createSessionService({ db: deps.db, now: deps.now });
  const otp = createOtpService({
    db: deps.db,
    sms: deps.sms,
    now: deps.now,
    pepper: deps.config.otpPepper,
  });

  const app = new Hono<AppEnv>();

  app.onError(handleError);
  app.notFound((c) => {
    const body: ErrorBody = { error: { code: "not_found", message: "Not found" } };
    return c.json(body, 404);
  });
  app.use(
    "*",
    bodyLimit({
      maxSize: 64 * 1024,
      onError: (c) => {
        const body: ErrorBody = { error: { code: "validation", message: "Request body is too large" } };
        return c.json(body, 413);
      },
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  const v1 = new Hono<AppEnv>();
  v1.use("*", serviceAuth(deps.config));
  v1.get("/ping", (c) => c.json({ service: c.get("service"), ip: c.get("clientIp") }));
  v1.route("/auth", createCustomerAuthRoutes({ db: deps.db, otp, sessions }));

  app.route("/v1", v1);
  return app;
}
```

- [ ] **Step 6: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth): add customer mobile OTP login routes"
```

---

### Task 10: Staff authentication, audit log and staff CLI

**Files:**
- Create: `src/audit/record.ts`, `src/auth/staffAuth.ts`, `src/auth/staffRoutes.ts`, `scripts/create-staff.ts`
- Modify: `src/app.ts`
- Test: `src/auth/staffRoutes.test.ts`

**Interfaces:**
- Consumes: `staff`, `auditLog`, `Executor` (Task 4), `Cipher`, `randomToken` (Task 3), `AppError`, `onInvalid`, `onlyService`, `Clock` (Task 5), `SessionService`, `requireStaff` (Task 8), `staffLoginSchema`, `staffRoles`, `StaffRole`, `StaffProfile`, `StaffSessionResponse` (Task 8 contracts).
- Produces:
  - `type AuditActor = { type: "staff" | "customer" | "system"; id: string | null; ip?: string | null }`
  - `recordAudit(db: Executor, input: { actor: AuditActor; action: string; entity: string; entityId?: string | null; before?: unknown; after?: unknown; at: Date }): Promise<void>`
  - `staffActor(c: Context<AppEnv>): AuditActor`
  - `STAFF_MAX_FAILED_LOGINS = 5`, `STAFF_LOCK_MS = 900000`
  - `createStaffAuth(deps: { db: Db; cipher: Cipher; now: Clock }): StaffAuth`
  - `type StaffAuth = { createStaff(input: { email: string; name: string; role: StaffRole; password: string }): Promise<{ staff: StaffRow; totpSecret: string; otpauthUrl: string }>; authenticate(input: { email: string; password: string; totp: string }): Promise<StaffRow> }`
  - `toStaffProfile(row: StaffRow): StaffProfile`
  - `createStaffAuthRoutes(deps: { db: Db; staffAuth: StaffAuth; sessions: SessionService; now: Clock }): Hono<AppEnv>`, mounted at `/v1/staff/auth`: `POST /login`, `POST /logout`, `GET /me`

- [ ] **Step 1: Write the failing test `src/auth/staffRoutes.test.ts`**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { generate } from "otplib";
import type { StaffSessionResponse } from "@nextera/contracts";
import { auditLog, staff } from "../db/schema";
import { createTestContext } from "../test/context";
import type { TestContext } from "../test/context";
import { STAFF_LOCK_MS, createStaffAuth } from "./staffAuth";

let ctx: TestContext;
let totpSecret: string;
const email = "ops@srahira.com";
const password = "correct horse battery staple";

beforeAll(async () => {
  ctx = await createTestContext();
});

beforeEach(async () => {
  await ctx.reset();
  const created = await createStaffAuth(ctx.deps).createStaff({ email, name: "Ops Person", role: "ops", password });
  totpSecret = created.totpSecret;
});

afterAll(async () => {
  await ctx.close();
});

async function currentTotp(): Promise<string> {
  return generate({ secret: totpSecret, epoch: Math.floor(ctx.clock.now().getTime() / 1000) });
}

async function attempt(overrides: Partial<{ email: string; password: string; totp: string }> = {}) {
  return ctx.call("/v1/staff/auth/login", {
    service: "admin",
    json: { email, password, totp: await currentTotp(), ...overrides },
  });
}

describe("staff auth", () => {
  it("is only available to the admin app", async () => {
    const res = await ctx.call("/v1/staff/auth/login", {
      service: "portal",
      json: { email, password, totp: await currentTotp() },
    });
    expect(res.status).toBe(403);
  });

  it("logs in with password and TOTP and never exposes secrets", async () => {
    const res = await attempt({ email: "OPS@srahira.com" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as StaffSessionResponse;
    expect(body.staff).toEqual({ id: expect.any(String), email, name: "Ops Person", role: "ops" });
    const me = await ctx.call("/v1/staff/auth/me", { service: "admin", token: body.token });
    expect(await me.json()).toEqual({ staff: body.staff });
    const audits = await ctx.db.select().from(auditLog).where(eq(auditLog.action, "staff.login"));
    expect(audits).toHaveLength(1);
  });

  it("stores the TOTP secret encrypted", async () => {
    const [row] = await ctx.db.select().from(staff);
    expect(row?.totpSecret).not.toBe(totpSecret);
    expect(ctx.deps.cipher.decrypt(row?.totpSecret ?? "")).toBe(totpSecret);
  });

  it("rejects a wrong password, a wrong code and an unknown email alike", async () => {
    const wrongCode = (await currentTotp()) === "000000" ? "111111" : "000000";
    for (const res of [
      await attempt({ password: "nope" }),
      await attempt({ totp: wrongCode }),
      await attempt({ email: "who@srahira.com" }),
    ]) {
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({
        error: { code: "unauthorized", message: "Email, password or code is incorrect" },
      });
    }
  });

  it("locks the account after five failures, then unlocks after 15 minutes", async () => {
    for (let index = 0; index < 5; index += 1) await attempt({ password: "nope" });
    const locked = await attempt();
    expect(locked.status).toBe(423);
    ctx.clock.advance(STAFF_LOCK_MS);
    expect((await attempt()).status).toBe(200);
  });

  it("refuses disabled staff", async () => {
    await ctx.db.update(staff).set({ disabledAt: ctx.clock.now() });
    expect((await attempt()).status).toBe(401);
  });

  it("does not accept a staff token on customer routes", async () => {
    const { token } = (await (await attempt()).json()) as StaffSessionResponse;
    expect((await ctx.call("/v1/auth/me", { token })).status).toBe(401);
  });

  it("revokes the session on logout", async () => {
    const { token } = (await (await attempt()).json()) as StaffSessionResponse;
    expect((await ctx.call("/v1/staff/auth/logout", { service: "admin", method: "POST", token })).status).toBe(204);
    expect((await ctx.call("/v1/staff/auth/me", { service: "admin", token })).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/auth/staffRoutes.test.ts`
Expected: FAIL, unresolved import `./staffAuth`.

- [ ] **Step 3: Write `src/audit/record.ts`**

```ts
import type { Context } from "hono";
import type { Executor } from "../db/client";
import { auditLog } from "../db/schema";
import type { AppEnv } from "../http/types";

export type AuditActor = {
  type: "staff" | "customer" | "system";
  id: string | null;
  ip?: string | null;
};

export async function recordAudit(
  db: Executor,
  input: {
    actor: AuditActor;
    action: string;
    entity: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
    at: Date;
  },
): Promise<void> {
  await db.insert(auditLog).values({
    actorType: input.actor.type,
    actorId: input.actor.id,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    ip: input.actor.ip ?? null,
    at: input.at,
  });
}

export function staffActor(c: Context<AppEnv>): AuditActor {
  return { type: "staff", id: c.get("staff").id, ip: c.get("clientIp") };
}
```

- [ ] **Step 4: Write `src/auth/staffAuth.ts`**

```ts
import { eq } from "drizzle-orm";
import { hash, verify as verifyPassword } from "@node-rs/argon2";
import { generateSecret, generateURI, verify as verifyTotp } from "otplib";
import type { StaffProfile, StaffRole } from "@nextera/contracts";
import type { Db } from "../db/client";
import { staff } from "../db/schema";
import type { StaffRow } from "../db/schema";
import { AppError } from "../http/errors";
import type { Clock } from "../http/types";
import type { Cipher } from "../lib/crypto";

export const STAFF_MAX_FAILED_LOGINS = 5;
export const STAFF_LOCK_MS = 15 * 60 * 1000;

export type StaffAuth = {
  createStaff(input: {
    email: string;
    name: string;
    role: StaffRole;
    password: string;
  }): Promise<{ staff: StaffRow; totpSecret: string; otpauthUrl: string }>;
  authenticate(input: { email: string; password: string; totp: string }): Promise<StaffRow>;
};

const DUMMY_HASH_INPUT = "srahira-dummy-password";

export function toStaffProfile(row: StaffRow): StaffProfile {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export function createStaffAuth(deps: { db: Db; cipher: Cipher; now: Clock }): StaffAuth {
  const dummyHash = hash(DUMMY_HASH_INPUT);
  const invalid = () => new AppError("unauthorized", "Email, password or code is incorrect");

  return {
    async createStaff({ email, name, role, password }) {
      if (password.length < 12) throw new Error("Staff passwords must be at least 12 characters");
      const normalizedEmail = email.trim().toLowerCase();
      const totpSecret = generateSecret();
      const [row] = await deps.db
        .insert(staff)
        .values({
          email: normalizedEmail,
          name,
          role,
          passwordHash: await hash(password),
          totpSecret: deps.cipher.encrypt(totpSecret),
        })
        .returning();
      if (!row) throw new Error("Failed to create staff member");
      return {
        staff: row,
        totpSecret,
        otpauthUrl: generateURI({ issuer: "Srahira Admin", label: normalizedEmail, secret: totpSecret }),
      };
    },

    async authenticate({ email, password, totp }) {
      const now = deps.now();
      const [member] = await deps.db.select().from(staff).where(eq(staff.email, email.trim().toLowerCase()));

      if (!member || member.disabledAt) {
        await verifyPassword(await dummyHash, password);
        throw invalid();
      }

      if (member.lockedUntil && member.lockedUntil.getTime() > now.getTime()) {
        throw new AppError("account_locked", "Too many failed attempts. Try again later.", {
          retryAfterSeconds: Math.ceil((member.lockedUntil.getTime() - now.getTime()) / 1000),
        });
      }

      const passwordOk = await verifyPassword(member.passwordHash, password);
      const totpOk =
        passwordOk &&
        (
          await verifyTotp({
            secret: deps.cipher.decrypt(member.totpSecret),
            token: totp,
            epoch: Math.floor(now.getTime() / 1000),
            epochTolerance: 30,
          })
        ).valid;

      if (!totpOk) {
        const failed = member.failedLogins + 1;
        const lock = failed >= STAFF_MAX_FAILED_LOGINS;
        await deps.db
          .update(staff)
          .set({
            failedLogins: lock ? 0 : failed,
            lockedUntil: lock ? new Date(now.getTime() + STAFF_LOCK_MS) : member.lockedUntil,
          })
          .where(eq(staff.id, member.id));
        throw invalid();
      }

      const [updated] = await deps.db
        .update(staff)
        .set({ failedLogins: 0, lockedUntil: null })
        .where(eq(staff.id, member.id))
        .returning();
      return updated ?? member;
    },
  };
}
```

- [ ] **Step 5: Write `src/auth/staffRoutes.ts`**

```ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { staffLoginSchema, staffRoles } from "@nextera/contracts";
import type { StaffSessionResponse } from "@nextera/contracts";
import { recordAudit } from "../audit/record";
import type { Db } from "../db/client";
import { onInvalid } from "../http/errors";
import { onlyService } from "../http/serviceAuth";
import type { AppEnv, Clock } from "../http/types";
import { requireStaff } from "./middleware";
import type { SessionService } from "./sessions";
import { toStaffProfile } from "./staffAuth";
import type { StaffAuth } from "./staffAuth";

export function createStaffAuthRoutes(deps: {
  db: Db;
  staffAuth: StaffAuth;
  sessions: SessionService;
  now: Clock;
}): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  const signedIn = requireStaff(deps, staffRoles);

  routes.use("*", onlyService("admin"));

  routes.post("/login", zValidator("json", staffLoginSchema, onInvalid), async (c) => {
    const member = await deps.staffAuth.authenticate(c.req.valid("json"));
    const session = await deps.sessions.create({
      subjectType: "staff",
      subjectId: member.id,
      ip: c.get("clientIp"),
      userAgent: c.get("userAgent"),
    });
    await recordAudit(deps.db, {
      actor: { type: "staff", id: member.id, ip: c.get("clientIp") },
      action: "staff.login",
      entity: "staff",
      entityId: member.id,
      at: deps.now(),
    });
    const body: StaffSessionResponse = {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      staff: toStaffProfile(member),
    };
    return c.json(body);
  });

  routes.post("/logout", signedIn, async (c) => {
    await deps.sessions.revoke(c.get("sessionId"));
    return c.body(null, 204);
  });

  routes.get("/me", signedIn, (c) => c.json({ staff: toStaffProfile(c.get("staff")) }));

  return routes;
}
```

- [ ] **Step 6: Mount in `src/app.ts`**

Add these imports:

```ts
import { createStaffAuth } from "./auth/staffAuth";
import { createStaffAuthRoutes } from "./auth/staffRoutes";
```

Below the `otp` constant, add:

```ts
  const staffAuth = createStaffAuth({ db: deps.db, cipher: deps.cipher, now: deps.now });
```

Below the `v1.route("/auth", ...)` line, add:

```ts
  v1.route("/staff/auth", createStaffAuthRoutes({ db: deps.db, staffAuth, sessions, now: deps.now }));
```

- [ ] **Step 7: Write `scripts/create-staff.ts`**

```ts
import { staffRoles } from "@nextera/contracts";
import type { StaffRole } from "@nextera/contracts";
import { createStaffAuth } from "../src/auth/staffAuth";
import { createDb } from "../src/db/client";
import { loadEnv } from "../src/env";
import { createCipher, randomToken } from "../src/lib/crypto";

try {
  process.loadEnvFile();
} catch {
  console.info("No .env file found, using the process environment");
}

const [email, role, ...nameParts] = process.argv.slice(2);

if (!email || !role || !staffRoles.includes(role as StaffRole)) {
  console.error(`Usage: npm run staff:create -- <email> <${staffRoles.join("|")}> [full name]`);
  process.exit(1);
}

const env = loadEnv();
const password = randomToken(18);
const staffAuth = createStaffAuth({
  db: createDb(env.DATABASE_URL),
  cipher: createCipher(env.DATA_KEY),
  now: () => new Date(),
});

const { staff, otpauthUrl } = await staffAuth.createStaff({
  email,
  name: nameParts.join(" ") || email,
  role: role as StaffRole,
  password,
});

console.info(`Created ${staff.role} ${staff.email}`);
console.info(`Temporary password: ${password}`);
console.info(`Add to an authenticator app: ${otpauthUrl}`);
process.exit(0);
```

- [ ] **Step 8: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(auth): add staff password and TOTP login with lockout and audit"
```

---

### Task 11: Plans API

**Files:**
- Create: `packages/contracts/src/plans.ts`, `src/plans/service.ts`, `src/plans/routes.ts`, `src/plans/adminRoutes.ts`
- Modify: `packages/contracts/src/index.ts`, `src/app.ts`
- Test: `src/plans/plans.test.ts`

**Interfaces:**
- Consumes: `plans`, `PlanRow`, `Db` (Task 4), `isUniqueViolation` (Task 3), `AppError`, `onInvalid`, `onlyService` (Task 5), `requireStaff`, `SessionService` (Task 8), `recordAudit`, `staffActor`, `AuditActor` (Task 10).
- Produces:
  - Contracts: `planStatuses`, `type PlanStatus`, `planInputSchema`, `planUpdateSchema`, `type PlanInput`, `type PlanUpdate`, `type Plan = { id; slug; name; description; rateBps; tenureMonths; minPaise; maxPaise; status; createdAt: string; updatedAt: string }`
  - Service: `toPlan(row: PlanRow): Plan`, `listActivePlans(db: Db): Promise<PlanRow[]>`, `getActivePlanBySlug(db: Db, slug: string): Promise<PlanRow | null>`, `listAllPlans(db: Db): Promise<PlanRow[]>`, `createPlan(db: Db, input: PlanInput, actor: AuditActor, now: Date): Promise<PlanRow>`, `updatePlan(db: Db, id: string, patch: PlanUpdate, actor: AuditActor, now: Date): Promise<PlanRow>`, `deletePlan(db: Db, id: string, actor: AuditActor, now: Date): Promise<void>`
  - Routes: `createPlanRoutes({ db })` at `/v1/plans` (portal): `GET /`, `GET /:slug`. `createAdminPlanRoutes({ db, sessions, now })` at `/v1/admin/plans` (admin): `GET /` (all roles), `POST /`, `PATCH /:id`, `DELETE /:id` (owner, ops).

- [ ] **Step 1: Write `packages/contracts/src/plans.ts`**

```ts
import { z } from "zod";

export const planStatuses = ["draft", "active", "archived"] as const;
export type PlanStatus = (typeof planStatuses)[number];

const planFields = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens"),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000),
  rateBps: z.number().int().min(1, "Rate must be above zero").max(3600),
  tenureMonths: z.number().int().min(1).max(120),
  minPaise: z.number().int().min(100, "Minimum must be at least ₹1"),
  maxPaise: z.number().int().max(Number.MAX_SAFE_INTEGER),
});

export const planInputSchema = planFields
  .extend({
    description: planFields.shape.description.default(""),
    status: z.enum(["draft", "active"]).default("draft"),
  })
  .refine((plan) => plan.maxPaise >= plan.minPaise, {
    message: "Maximum must be at least the minimum",
    path: ["maxPaise"],
  });

export const planUpdateSchema = planFields
  .partial()
  .extend({ status: z.enum(planStatuses).optional() })
  .refine((patch) => Object.keys(patch).length > 0, { message: "Nothing to update" });

export type PlanInput = z.infer<typeof planInputSchema>;
export type PlanUpdate = z.infer<typeof planUpdateSchema>;

export type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  rateBps: number;
  tenureMonths: number;
  minPaise: number;
  maxPaise: number;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
};
```

Add `export * from "./plans";` to `packages/contracts/src/index.ts`.

- [ ] **Step 2: Write the failing test `src/plans/plans.test.ts`**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Plan, StaffRole, StaffSessionResponse } from "@nextera/contracts";
import { generate } from "otplib";
import { auditLog } from "../db/schema";
import { createStaffAuth } from "../auth/staffAuth";
import { createTestContext } from "../test/context";
import type { TestContext } from "../test/context";

let ctx: TestContext;
let opsToken: string;
let supportToken: string;

const growth = {
  slug: "growth-12",
  name: "Growth 12",
  description: "Twelve months at 8% p.a.",
  rateBps: 800,
  tenureMonths: 12,
  minPaise: 1000000,
  maxPaise: 1000000000,
  status: "active",
};

async function staffToken(email: string, role: StaffRole): Promise<string> {
  const password = "a sufficiently long password";
  const { totpSecret } = await createStaffAuth(ctx.deps).createStaff({ email, name: email, role, password });
  const totp = await generate({ secret: totpSecret, epoch: Math.floor(ctx.clock.now().getTime() / 1000) });
  const res = await ctx.call("/v1/staff/auth/login", { service: "admin", json: { email, password, totp } });
  return ((await res.json()) as StaffSessionResponse).token;
}

function admin(path: string, options: { method?: string; json?: unknown; token?: string } = {}) {
  return ctx.call(`/v1/admin/plans${path}`, { service: "admin", token: opsToken, ...options });
}

async function createGrowth(overrides: Record<string, unknown> = {}): Promise<Plan> {
  const res = await admin("", { json: { ...growth, ...overrides } });
  expect(res.status).toBe(201);
  return ((await res.json()) as { plan: Plan }).plan;
}

beforeAll(async () => {
  ctx = await createTestContext();
});

beforeEach(async () => {
  await ctx.reset();
  opsToken = await staffToken("ops@srahira.com", "ops");
  supportToken = await staffToken("support@srahira.com", "support");
});

afterAll(async () => {
  await ctx.close();
});

describe("admin plans", () => {
  it("creates a plan and audits it", async () => {
    const plan = await createGrowth();
    expect(plan).toMatchObject({ slug: "growth-12", rateBps: 800, status: "active" });
    const audits = await ctx.db.select().from(auditLog).where(eq(auditLog.action, "plan.create"));
    expect(audits).toHaveLength(1);
    expect(audits[0]?.entityId).toBe(plan.id);
  });

  it("lets support read but not write", async () => {
    await createGrowth();
    const list = await admin("", { token: supportToken });
    expect(list.status).toBe(200);
    expect(((await list.json()) as { plans: Plan[] }).plans).toHaveLength(1);
    expect((await admin("", { token: supportToken, json: { ...growth, slug: "other" } })).status).toBe(403);
  });

  it("validates slugs and amount ranges", async () => {
    const badSlug = await admin("", { json: { ...growth, slug: "Bad Slug" } });
    expect(badSlug.status).toBe(400);
    const slugBody = (await badSlug.json()) as { error: { fields: Record<string, string[]> } };
    expect(Object.keys(slugBody.error.fields)).toEqual(["slug"]);

    const badRange = await admin("", { json: { ...growth, minPaise: 5000, maxPaise: 4000 } });
    expect(badRange.status).toBe(400);
    const rangeBody = (await badRange.json()) as { error: { fields: Record<string, string[]> } };
    expect(Object.keys(rangeBody.error.fields)).toEqual(["maxPaise"]);
  });

  it("refuses a duplicate slug", async () => {
    await createGrowth();
    const res = await admin("", { json: growth });
    expect(res.status).toBe(409);
  });

  it("edits an active plan but keeps its slug fixed", async () => {
    const plan = await createGrowth();
    const edited = await admin(`/${plan.id}`, { method: "PATCH", json: { rateBps: 850 } });
    expect(edited.status).toBe(200);
    expect(((await edited.json()) as { plan: Plan }).plan.rateBps).toBe(850);
    expect((await admin(`/${plan.id}`, { method: "PATCH", json: { slug: "renamed" } })).status).toBe(409);
    expect((await admin(`/${plan.id}`, { method: "PATCH", json: { status: "draft" } })).status).toBe(409);
    expect((await admin(`/${plan.id}`, { method: "PATCH", json: { minPaise: 2000000000 } })).status).toBe(400);
  });

  it("deletes drafts only", async () => {
    const draft = await createGrowth({ slug: "draft-plan", status: "draft" });
    const active = await createGrowth();
    expect((await admin(`/${draft.id}`, { method: "DELETE" })).status).toBe(204);
    expect((await admin(`/${active.id}`, { method: "DELETE" })).status).toBe(409);
  });

  it("returns 404 for unknown ids and 400 for malformed ids", async () => {
    expect((await admin("/00000000-0000-4000-8000-000000000000", { method: "PATCH", json: { rateBps: 900 } })).status).toBe(404);
    expect((await admin("/not-a-uuid", { method: "PATCH", json: { rateBps: 900 } })).status).toBe(400);
  });

  it("is closed to the portal app", async () => {
    expect((await ctx.call("/v1/admin/plans", { service: "portal", token: opsToken })).status).toBe(403);
  });
});

describe("public plans", () => {
  it("lists only active plans and hides archived ones", async () => {
    const active = await createGrowth();
    await createGrowth({ slug: "draft-plan", status: "draft" });
    let res = await ctx.call("/v1/plans");
    expect(((await res.json()) as { plans: Plan[] }).plans.map((plan) => plan.slug)).toEqual(["growth-12"]);
    expect((await ctx.call("/v1/plans/draft-plan")).status).toBe(404);
    expect((await ctx.call("/v1/plans/growth-12")).status).toBe(200);

    await admin(`/${active.id}`, { method: "PATCH", json: { status: "archived" } });
    res = await ctx.call("/v1/plans");
    expect(((await res.json()) as { plans: Plan[] }).plans).toHaveLength(0);
  });

  it("is closed to the admin app", async () => {
    expect((await ctx.call("/v1/plans", { service: "admin" })).status).toBe(403);
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx vitest run src/plans`
Expected: FAIL, the plan routes return 404.

- [ ] **Step 4: Write `src/plans/service.ts`**

```ts
import { and, asc, desc, eq } from "drizzle-orm";
import type { Plan, PlanInput, PlanUpdate } from "@nextera/contracts";
import { recordAudit } from "../audit/record";
import type { AuditActor } from "../audit/record";
import type { Db } from "../db/client";
import { plans } from "../db/schema";
import type { PlanRow } from "../db/schema";
import { AppError } from "../http/errors";
import { isUniqueViolation } from "../lib/pgErrors";

export function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    rateBps: row.rateBps,
    tenureMonths: row.tenureMonths,
    minPaise: row.minPaise,
    maxPaise: row.maxPaise,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const slugTaken = () => new AppError("conflict", "A plan with this slug already exists");

export async function listActivePlans(db: Db): Promise<PlanRow[]> {
  return db
    .select()
    .from(plans)
    .where(eq(plans.status, "active"))
    .orderBy(asc(plans.tenureMonths), asc(plans.minPaise));
}

export async function getActivePlanBySlug(db: Db, slug: string): Promise<PlanRow | null> {
  const [row] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.slug, slug), eq(plans.status, "active")));
  return row ?? null;
}

export async function listAllPlans(db: Db): Promise<PlanRow[]> {
  return db.select().from(plans).orderBy(desc(plans.createdAt));
}

export async function createPlan(db: Db, input: PlanInput, actor: AuditActor, now: Date): Promise<PlanRow> {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(plans)
        .values({ ...input, createdAt: now, updatedAt: now })
        .returning();
      if (!row) throw new Error("Failed to create plan");
      await recordAudit(tx, { actor, action: "plan.create", entity: "plan", entityId: row.id, after: toPlan(row), at: now });
      return row;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
}

export async function updatePlan(
  db: Db,
  id: string,
  patch: PlanUpdate,
  actor: AuditActor,
  now: Date,
): Promise<PlanRow> {
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx.select().from(plans).where(eq(plans.id, id)).for("update");
      if (!current) throw new AppError("not_found", "Plan not found");
      if (patch.slug !== undefined && patch.slug !== current.slug && current.status !== "draft") {
        throw new AppError("conflict", "The slug can only change while the plan is a draft");
      }
      if (patch.status === "draft" && current.status !== "draft") {
        throw new AppError("conflict", "A published plan cannot return to draft");
      }
      const minPaise = patch.minPaise ?? current.minPaise;
      const maxPaise = patch.maxPaise ?? current.maxPaise;
      if (maxPaise < minPaise) {
        const message = "Maximum must be at least the minimum";
        throw new AppError("validation", message, { fields: { maxPaise: [message] } });
      }
      const [row] = await tx
        .update(plans)
        .set({ ...patch, updatedAt: now })
        .where(eq(plans.id, id))
        .returning();
      if (!row) throw new Error("Failed to update plan");
      await recordAudit(tx, {
        actor,
        action: "plan.update",
        entity: "plan",
        entityId: id,
        before: toPlan(current),
        after: toPlan(row),
        at: now,
      });
      return row;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
}

export async function deletePlan(db: Db, id: string, actor: AuditActor, now: Date): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(plans).where(eq(plans.id, id)).for("update");
    if (!current) throw new AppError("not_found", "Plan not found");
    if (current.status !== "draft") {
      throw new AppError("conflict", "Only draft plans can be deleted. Archive this plan instead.");
    }
    await tx.delete(plans).where(eq(plans.id, id));
    await recordAudit(tx, { actor, action: "plan.delete", entity: "plan", entityId: id, before: toPlan(current), at: now });
  });
}
```

- [ ] **Step 5: Write `src/plans/routes.ts`**

```ts
import { Hono } from "hono";
import type { Db } from "../db/client";
import { AppError } from "../http/errors";
import { onlyService } from "../http/serviceAuth";
import type { AppEnv } from "../http/types";
import { getActivePlanBySlug, listActivePlans, toPlan } from "./service";

export function createPlanRoutes(deps: { db: Db }): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.use("*", onlyService("portal"));

  routes.get("/", async (c) => {
    const rows = await listActivePlans(deps.db);
    return c.json({ plans: rows.map(toPlan) });
  });

  routes.get("/:slug", async (c) => {
    const row = await getActivePlanBySlug(deps.db, c.req.param("slug"));
    if (!row) throw new AppError("not_found", "Plan not found");
    return c.json({ plan: toPlan(row) });
  });

  return routes;
}
```

- [ ] **Step 6: Write `src/plans/adminRoutes.ts`**

```ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { planInputSchema, planUpdateSchema, staffRoles } from "@nextera/contracts";
import { staffActor } from "../audit/record";
import { requireStaff } from "../auth/middleware";
import type { SessionService } from "../auth/sessions";
import type { Db } from "../db/client";
import { onInvalid } from "../http/errors";
import { onlyService } from "../http/serviceAuth";
import type { AppEnv, Clock } from "../http/types";
import { createPlan, deletePlan, listAllPlans, toPlan, updatePlan } from "./service";

const idParam = z.object({ id: z.string().uuid() });

export function createAdminPlanRoutes(deps: { db: Db; sessions: SessionService; now: Clock }): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  const anyStaff = requireStaff(deps, staffRoles);
  const editors = requireStaff(deps, ["owner", "ops"]);

  routes.use("*", onlyService("admin"));

  routes.get("/", anyStaff, async (c) => {
    const rows = await listAllPlans(deps.db);
    return c.json({ plans: rows.map(toPlan) });
  });

  routes.post("/", editors, zValidator("json", planInputSchema, onInvalid), async (c) => {
    const row = await createPlan(deps.db, c.req.valid("json"), staffActor(c), deps.now());
    return c.json({ plan: toPlan(row) }, 201);
  });

  routes.patch(
    "/:id",
    editors,
    zValidator("param", idParam, onInvalid),
    zValidator("json", planUpdateSchema, onInvalid),
    async (c) => {
      const row = await updatePlan(deps.db, c.req.valid("param").id, c.req.valid("json"), staffActor(c), deps.now());
      return c.json({ plan: toPlan(row) });
    },
  );

  routes.delete("/:id", editors, zValidator("param", idParam, onInvalid), async (c) => {
    await deletePlan(deps.db, c.req.valid("param").id, staffActor(c), deps.now());
    return c.body(null, 204);
  });

  return routes;
}
```

- [ ] **Step 7: Mount in `src/app.ts`**

Add these imports:

```ts
import { createAdminPlanRoutes } from "./plans/adminRoutes";
import { createPlanRoutes } from "./plans/routes";
```

Below the `v1.route("/staff/auth", ...)` line, add:

```ts
  v1.route("/plans", createPlanRoutes({ db: deps.db }));
  v1.route("/admin/plans", createAdminPlanRoutes({ db: deps.db, sessions, now: deps.now }));
```

- [ ] **Step 8: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(plans): add public and staff plan APIs with audit trail"
```

---

### Task 12: Server entry, build and README

**Files:**
- Create: `src/server.ts`, `.env.example`, `README.md`

**Interfaces:**
- Consumes: `loadEnv` (Task 5), `createApp` (Task 11 version), `createDb` (Task 4), `createCipher`, `createConsoleSms`, `createMsg91Sms` (Task 3).
- Produces: a runnable `npm run dev` / `npm run build && npm start` server on `PORT`.

- [ ] **Step 1: Write `src/server.ts`**

```ts
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createDb } from "./db/client";
import { loadEnv } from "./env";
import type { Env } from "./env";
import { createCipher } from "./lib/crypto";
import { createConsoleSms, createMsg91Sms } from "./lib/sms";
import type { SmsSender } from "./lib/sms";

try {
  process.loadEnvFile();
} catch {
  console.info("No .env file found, using the process environment");
}

function createSms(env: Env): SmsSender {
  if (env.SMS_PROVIDER === "console") return createConsoleSms();
  if (!env.MSG91_AUTH_KEY || !env.MSG91_OTP_TEMPLATE_ID) throw new Error("MSG91 is not configured");
  return createMsg91Sms({ authKey: env.MSG91_AUTH_KEY, templateId: env.MSG91_OTP_TEMPLATE_ID });
}

const env = loadEnv();

const app = createApp({
  db: createDb(env.DATABASE_URL),
  cipher: createCipher(env.DATA_KEY),
  sms: createSms(env),
  now: () => new Date(),
  config: {
    otpPepper: env.OTP_PEPPER,
    portalServiceKey: env.PORTAL_SERVICE_KEY,
    adminServiceKey: env.ADMIN_SERVICE_KEY,
  },
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.info(`srahira-backend listening on http://localhost:${info.port}`);
});
```

- [ ] **Step 2: Write `.env.example`**

```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://user:password@host/srahira?sslmode=require
DATA_KEY=
OTP_PEPPER=
PORTAL_SERVICE_KEY=
ADMIN_SERVICE_KEY=
SMS_PROVIDER=console
MSG91_AUTH_KEY=
MSG91_OTP_TEMPLATE_ID=
```

- [ ] **Step 3: Write `README.md`**

````markdown
# srahira-backend

API for the Srahira investment platform. The customer portal (`srahira`) and the admin console (`srahira-admin`) call it server-side; browsers never call it directly.

## Setup

```bash
npm install
cp .env.example .env
node -e "console.log('DATA_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "for (const k of ['OTP_PEPPER','PORTAL_SERVICE_KEY','ADMIN_SERVICE_KEY']) console.log(k + '=' + require('crypto').randomBytes(32).toString('base64url'))"
npm run db:migrate
npm run staff:create -- you@srahira.com owner "Your Name"
npm run dev
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Watch mode on `PORT` (default 4000) |
| `npm test` | Vitest against in-memory PGlite Postgres |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Generate a migration after editing `src/db/schema` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run staff:create -- <email> <owner\|ops\|support> [name]` | Create a staff member and print their password and TOTP URI |
| `npm run build && npm start` | Production build |

## Calling the API

Every `/v1` request needs `x-service-key` (portal or admin key). Authenticated requests also send `authorization: Bearer <token>`. The calling app forwards the visitor's IP in `x-forwarded-for` and user agent in `x-client-user-agent`.

Errors are always `{ "error": { "code", "message", "fields"?, "retryAfterSeconds"? } }`.

## Endpoints

| Method | Path | App | Auth |
|---|---|---|---|
| POST | `/v1/auth/otp/request` | portal | none |
| POST | `/v1/auth/otp/verify` | portal | none |
| POST | `/v1/auth/logout` | portal | customer |
| GET | `/v1/auth/me` | portal | customer |
| GET | `/v1/plans`, `/v1/plans/:slug` | portal | none |
| POST | `/v1/staff/auth/login` | admin | none |
| POST | `/v1/staff/auth/logout` | admin | staff |
| GET | `/v1/staff/auth/me` | admin | staff |
| GET | `/v1/admin/plans` | admin | any staff |
| POST, PATCH, DELETE | `/v1/admin/plans[/:id]` | admin | owner, ops |
````

- [ ] **Step 4: Verify build and a live boot**

Run:

```bash
npm test && npm run typecheck && npm run build
```

Expected: tests PASS, no type errors, `dist/server.js` created.

Then, with a real `DATABASE_URL` in `.env` (a Neon branch), run `npm run db:migrate && npm run dev`. In a second shell:

```bash
curl -s localhost:4000/health
curl -s -H "x-service-key: $PORTAL_SERVICE_KEY" -H "content-type: application/json" -d '{"phone":"9876543210"}' localhost:4000/v1/auth/otp/request
```

Expected: `{"ok":true}`, then a `challengeId` JSON response, with the OTP printed in the dev server log as `[sms] OTP for +919876543210: ......`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add server entry, env example and README"
```

---

## Notes for later plans

- **Sharing `@nextera/contracts`:** the frontends depend on `"@nextera/contracts": "file:../srahira-backend/packages/contracts"` with `transpilePackages: ["@nextera/contracts"]` in `next.config.ts`. Before the first frontend deploy, publish it to GitHub Packages (or vendor it at build time), because hosted builds won't have the sibling folder.
- **Blocking a customer** (plan 10) must also revoke their sessions. Add `revokeAllFor(subjectType, subjectId)` to `SessionService` then.
- **`settings` table** (TDS rate, minimum withdrawal) arrives with accruals in plan 5.
