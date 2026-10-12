import { describe, expect, it, vi } from "vitest";
import type { BackendResult } from "@/lib/backend/client";
import {
  bankAccountsHandler,
  clearSessionCookieHeader,
  kycHandler,
  meHandler,
  planHandler,
  plansHandler,
  walletHandler,
  walletTransactionsHandler,
  withdrawalsHandler,
} from "./handlers";
import type { HandlerDeps } from "./handlers";
import { errorStatus } from "./respond";

const customer = {
  id: "c1",
  phone: "+919876543210",
  name: "Asha Rao",
  email: null,
  status: "active",
  kycStatus: "submitted",
};

const plan = {
  id: "p1",
  slug: "steady-12",
  name: "Steady 12",
  description: "",
  rateBps: 800,
  tenureMonths: 12,
  minPaise: 1_000_000,
  maxPaise: 500_000_000,
  status: "active",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

function deps(result: BackendResult<unknown>, token: string | null = "tok") {
  const call = vi.fn(async () => result);
  return { call, deps: { token, call: call as unknown as HandlerDeps["call"] } };
}

async function read(response: Response) {
  return { status: response.status, body: await response.json(), headers: response.headers };
}

describe("meHandler", () => {
  it("returns the validated profile without caching", async () => {
    const { call, deps: d } = deps({ ok: true, status: 200, data: { customer } });

    const { status, body, headers } = await read(await meHandler(d));

    expect(call).toHaveBeenCalledWith("/v1/auth/me", { token: "tok" });
    expect(status).toBe(200);
    expect(body).toEqual({ customer });
    expect(headers.get("cache-control")).toBe("no-store");
  });

  it("answers 401 and clears the cookie when there is no session", async () => {
    const { call, deps: d } = deps({ ok: true, status: 200, data: {} }, null);

    const { status, body, headers } = await read(await meHandler(d));

    expect(call).not.toHaveBeenCalled();
    expect(status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(headers.get("set-cookie")).toBe(clearSessionCookieHeader());
  });

  it("treats a backend 401 as an expired session when the service key is accepted", async () => {
    const call = vi.fn(async (path: string) =>
      path === "/v1/ping"
        ? { ok: true as const, status: 200, data: { service: "portal" } }
        : { ok: false as const, status: 401, error: { code: "unauthorized" as const, message: "Your session has expired." } },
    );

    const { status, body, headers } = await read(await meHandler({ token: "tok", call: call as unknown as HandlerDeps["call"] }));

    expect(call).toHaveBeenCalledWith("/v1/ping");
    expect(status).toBe(401);
    expect(body).toEqual({ error: { code: "unauthorized", message: "Your session has expired. Please sign in again." } });
    expect(headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("does not log customers out when the backend rejects the service key", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps: d } = deps({ ok: false, status: 401, error: { code: "unauthorized", message: "Missing or invalid service key" } });

    const { status, body, headers } = await read(await meHandler(d));

    expect(status).toBe(503);
    expect(body.error.message).not.toMatch(/service key/i);
    expect(headers.get("set-cookie")).toBeNull();
    expect(errorLog).toHaveBeenCalledWith(expect.stringMatching(/NEXTERA_PORTAL_SERVICE_KEY/));
    errorLog.mockRestore();
  });

  it("keeps blocked accounts as 403 without touching the cookie", async () => {
    const { deps: d } = deps({ ok: false, status: 403, error: { code: "account_blocked", message: "Blocked" } });

    const { status, headers } = await read(await meHandler(d));

    expect(status).toBe(403);
    expect(headers.get("set-cookie")).toBeNull();
  });

  it("refuses malformed profiles with 502", async () => {
    const { deps: d } = deps({ ok: true, status: 200, data: { customer: { id: 1 } } });

    const { status, body } = await read(await meHandler(d));

    expect(status).toBe(502);
    expect(body.error.code).toBe("internal");
  });
});

describe("plansHandler", () => {
  it("returns only valid active plans", async () => {
    const { deps: d } = deps({ ok: true, status: 200, data: { plans: [plan, { ...plan, id: "p2", rateBps: -1 }] } });

    const { status, body } = await read(await plansHandler(d));

    expect(status).toBe(200);
    expect(body).toEqual({ plans: [plan] });
  });

  it("maps an unreachable backend to 503 and keeps retry hints", async () => {
    const down = await read(
      await plansHandler(deps({ ok: false, status: 503, error: { code: "unavailable", message: "Could not reach the server." } }).deps),
    );
    expect(down.status).toBe(503);

    const limited = await read(
      await plansHandler(
        deps({ ok: false, status: 429, error: { code: "rate_limited", message: "Slow down", retryAfterSeconds: 12 } }).deps,
      ),
    );
    expect(limited.status).toBe(429);
    expect(limited.body.error.retryAfterSeconds).toBe(12);
    expect(limited.headers.get("retry-after")).toBe("12");
  });
});

describe("planHandler", () => {
  it("fetches one plan by slug", async () => {
    const { call, deps: d } = deps({ ok: true, status: 200, data: { plan } });

    const { status, body } = await read(await planHandler(d, "steady-12"));

    expect(call).toHaveBeenCalledWith("/v1/plans/steady-12");
    expect(status).toBe(200);
    expect(body).toEqual({ plan });
  });

  it("rejects malformed slugs before calling the backend", async () => {
    const { call, deps: d } = deps({ ok: true, status: 200, data: { plan } });

    const { status } = await read(await planHandler(d, "../admin"));

    expect(call).not.toHaveBeenCalled();
    expect(status).toBe(404);
  });

  it("passes not_found through", async () => {
    const { deps: d } = deps({ ok: false, status: 404, error: { code: "not_found", message: "Plan not found" } });
    expect((await planHandler(d, "gone")).status).toBe(404);
  });
});

describe("error messages", () => {
  it("hides backend wording for codes that are not user-safe", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const forbidden = await read(
      await plansHandler(deps({ ok: false, status: 403, error: { code: "forbidden", message: "This endpoint is only available to the admin app" } }).deps),
    );
    const internal = await read(
      await plansHandler(deps({ ok: false, status: 500, error: { code: "internal", message: "pg: relation missing", fields: { a: ["b"] } } }).deps),
    );
    expect(forbidden.body.error.message).toBe("Something went wrong on our side. Please try again.");
    expect(internal.body.error).toEqual({ code: "internal", message: "Something went wrong on our side. Please try again." });
    expect(errorLog).toHaveBeenCalledWith("[api] backend error", "403:forbidden");
    errorLog.mockRestore();
  });

  it("keeps the wording and fields of user-safe errors", async () => {
    const result = await read(
      await planHandler(deps({ ok: false, status: 404, error: { code: "not_found", message: "Plan not found" } }).deps, "gone"),
    );
    expect(result.body.error.message).toBe("Plan not found");
  });
});

const kyc = {
  kycStatus: "rejected",
  profile: {
    panMasked: "XXXXXX234F",
    panName: "Asha Rao",
    dob: "1990-05-17",
    address: { line1: "12 Lake View Road", line2: "", city: "Hyderabad", state: "Telangana", pincode: "500034" },
    submittedAt: "2026-10-10T05:00:00.000Z",
    verifiedAt: null,
    rejectionReason: "Name does not match",
  },
};

const bankAccount = {
  id: "7f0c1c2e-1b7a-4d55-9a37-1f0f5b6a2c11",
  accountMasked: "XXXX9012",
  accountLast4: "9012",
  ifsc: "HDFC0001234",
  holderName: "Asha Rao",
  nameAtBank: "ASHA RAO",
  nameMatchResult: "DIRECT_MATCH",
  status: "verified",
  isPrimary: true,
  verifiedAt: "2026-10-11T06:00:00.000Z",
  reviewNote: null,
  createdAt: "2026-10-11T06:00:00.000Z",
};

const expiredSession = vi.fn(async (path: string) =>
  path === "/v1/ping"
    ? { ok: true as const, status: 200, data: { service: "portal" } }
    : { ok: false as const, status: 401, error: { code: "unauthorized" as const, message: "Your session has expired." } },
);

describe.each([
  { name: "kycHandler", handler: kycHandler, path: "/v1/kyc", data: kyc as unknown },
  { name: "bankAccountsHandler", handler: bankAccountsHandler, path: "/v1/bank-accounts", data: { accounts: [bankAccount] } as unknown },
])("$name", ({ handler, path, data }) => {
  it("returns the validated shape with the session token and no caching", async () => {
    const { call, deps: d } = deps({ ok: true, status: 200, data });

    const { status, body, headers } = await read(await handler(d));

    expect(call).toHaveBeenCalledWith(path, { token: "tok" });
    expect(status).toBe(200);
    expect(body).toEqual(data);
    expect(headers.get("cache-control")).toBe("no-store");
  });

  it("answers 401 and clears the cookie without a session", async () => {
    const { call, deps: d } = deps({ ok: true, status: 200, data }, null);

    const { status, headers } = await read(await handler(d));

    expect(call).not.toHaveBeenCalled();
    expect(status).toBe(401);
    expect(headers.get("set-cookie")).toBe(clearSessionCookieHeader());
    expect(headers.get("cache-control")).toBe("no-store");
  });

  it("clears the cookie when the backend expires the session", async () => {
    const { status, headers } = await read(await handler({ token: "tok", call: expiredSession as unknown as HandlerDeps["call"] }));

    expect(status).toBe(401);
    expect(headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("keeps the cookie and hides the cause when the service key is rejected", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps: d } = deps({ ok: false, status: 401, error: { code: "unauthorized", message: "Missing or invalid service key" } });

    const { status, body, headers } = await read(await handler(d));

    expect(status).toBe(503);
    expect(body.error.message).not.toMatch(/service key/i);
    expect(headers.get("set-cookie")).toBeNull();
    errorLog.mockRestore();
  });

  it("refuses malformed responses with 502", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { status, body } = await read(await handler(deps({ ok: true, status: 200, data: { kycStatus: 1, accounts: 2 } }).deps));

    expect(status).toBe(502);
    expect(body.error.code).toBe("internal");
    errorLog.mockRestore();
  });

  it("replaces backend wording for codes that are not user-safe", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { status, body } = await read(
      await handler(deps({ ok: false, status: 500, error: { code: "internal", message: "column pan does not exist" } }).deps),
    );

    expect(status).toBe(500);
    expect(body.error.message).toBe("Something went wrong on our side. Please try again.");
    errorLog.mockRestore();
  });
});

describe("kycHandler projection", () => {
  it("withholds date of birth and address once KYC is no longer editable", async () => {
    const submitted = { ...kyc, kycStatus: "submitted" };
    const { body } = await read(await kycHandler(deps({ ok: true, status: 200, data: submitted }).deps));

    expect(body.profile).toMatchObject({ panMasked: "XXXXXX234F", panName: "Asha Rao", dob: null, address: null });
    expect(JSON.stringify(body)).not.toContain("Lake View");
  });
});

describe("bankAccountsHandler names", () => {
  it("drops the name at the bank for unverified accounts", async () => {
    const data = { accounts: [{ ...bankAccount, status: "review", isPrimary: false, nameAtBank: "STRANGER NAME" }] };
    const { body } = await read(await bankAccountsHandler(deps({ ok: true, status: 200, data }).deps));

    expect(body.accounts[0].nameAtBank).toBeNull();
  });
});

describe("kycHandler masking", () => {
  it("never passes a full PAN to the browser", async () => {
    const leaked = { ...kyc, profile: { ...kyc.profile, panMasked: "ABCDE1234F" } };
    const { body } = await read(await kycHandler(deps({ ok: true, status: 200, data: leaked }).deps));

    expect(JSON.stringify(body)).not.toContain("ABCDE1234F");
    expect(body.profile.panMasked).toBe("XXXXXX234F");
  });
});

describe("bankAccountsHandler masking", () => {
  it("only exposes the last four digits of an account", async () => {
    const leaked = { accounts: [{ ...bankAccount, accountMasked: "123456789012", accountNo: "123456789012" }] };
    const { body } = await read(await bankAccountsHandler(deps({ ok: true, status: 200, data: leaked }).deps));

    expect(JSON.stringify(body)).not.toContain("123456789012");
    expect(body.accounts[0].accountMasked).toBe("XXXX9012");
  });
});

describe("errorStatus", () => {
  it("uses the upstream status when it is an error status", () => {
    expect(errorStatus({ code: "validation", message: "x" }, 400)).toBe(400);
    expect(errorStatus({ code: "unavailable", message: "x" }, 502)).toBe(503);
    expect(errorStatus({ code: "internal", message: "x" }, 200)).toBe(502);
  });
});

const walletBalance = {
  walletBalancePaise: 500000,
  withdrawalHoldPaise: 100000,
  withdrawablePaise: 400000,
  minWithdrawalPaise: 50000,
};

const withdrawal = {
  id: "11111111-1111-1111-1111-111111111111",
  amountPaise: 100000,
  status: "requested",
  destination: {
    bankAccountId: "22222222-2222-2222-2222-222222222222",
    accountMasked: "XXXX1234",
    ifsc: "HDFC0001234",
    holderName: "Asha Rao",
  },
  rejectReason: null,
  utr: null,
  requestedAt: "2026-10-12T06:00:00.000Z",
  decidedAt: null,
  cancelledAt: null,
  paidAt: null,
  failedAt: null,
  reversedAt: null,
};

const transaction = {
  id: "33333333-3333-3333-3333-333333333333",
  seq: 1,
  at: "2026-10-12T06:00:00.000Z",
  account: "wallet",
  direction: "credit",
  amountPaise: 50000,
  description: "Monthly return",
  refType: "accrual",
  refId: "accrual-1",
};

describe("walletHandler", () => {
  it("returns wallet balance from backend", async () => {
    const { body } = await read(await walletHandler(deps({ ok: true, status: 200, data: walletBalance }).deps));
    expect(body.walletBalancePaise).toBe(500000);
    expect(body.withdrawablePaise).toBe(400000);
  });

  it("returns 401 and clears session when unauthenticated", async () => {
    const res = await walletHandler(deps({ ok: true, status: 200, data: walletBalance }, null).deps);
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toContain(clearSessionCookieHeader());
  });

  it("returns error when backend fails", async () => {
    const res = await walletHandler(
      deps({ ok: false, status: 503, error: { code: "unavailable", message: "down" } }).deps,
    );
    expect(res.status).toBe(503);
  });

  it("returns 502 for malformed response", async () => {
    const res = await walletHandler(deps({ ok: true, status: 200, data: { unexpected: true } }).deps);
    expect(res.status).toBe(502);
  });
});

describe("withdrawalsHandler", () => {
  it("returns withdrawals list", async () => {
    const data = { withdrawals: [withdrawal], nextCursor: null };
    const { body } = await read(await withdrawalsHandler(deps({ ok: true, status: 200, data }).deps));
    expect(body.withdrawals).toHaveLength(1);
    expect(body.withdrawals[0].id).toBe(withdrawal.id);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await withdrawalsHandler(deps({ ok: true, status: 200, data: { withdrawals: [] } }, null).deps);
    expect(res.status).toBe(401);
  });
});

describe("walletTransactionsHandler", () => {
  it("returns transaction page", async () => {
    const data = { transactions: [transaction], nextCursor: null };
    const { body } = await read(await walletTransactionsHandler(deps({ ok: true, status: 200, data }).deps));
    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0].id).toBe(transaction.id);
  });

  it("passes through nextCursor", async () => {
    const data = { transactions: [transaction], nextCursor: "42" };
    const { body } = await read(await walletTransactionsHandler(deps({ ok: true, status: 200, data }).deps));
    expect(body.nextCursor).toBe("42");
  });

  it("returns 401 when not authenticated", async () => {
    const res = await walletTransactionsHandler(
      deps({ ok: true, status: 200, data: { transactions: [] } }, null).deps,
    );
    expect(res.status).toBe(401);
  });
});
