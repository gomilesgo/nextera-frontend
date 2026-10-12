import { beforeEach, describe, expect, it, vi } from "vitest";

const callBackend = vi.fn();
const readSessionToken = vi.fn();
const clearSession = vi.fn();

vi.mock("@/lib/backend/server", () => ({
  callBackend: (...args: unknown[]) => callBackend(...args),
}));

vi.mock("@/lib/session", () => ({
  readSessionToken: () => readSessionToken(),
  clearSession: () => clearSession(),
}));

const { addBankAccountAction, setPrimaryBankAccountAction } = await import("./actions");

const accountId = "7f0c1c2e-1b7a-4d55-9a37-1f0f5b6a2c11";

const account = {
  id: accountId,
  accountMasked: "XXXX9012",
  accountLast4: "9012",
  ifsc: "HDFC0001234",
  holderName: "Asha Rao",
  nameAtBank: "ASHA RAO",
  nameMatchResult: "DIRECT_MATCH",
  status: "verified",
  isPrimary: true,
  verifiedAt: "2026-10-12T06:00:00.000Z",
  reviewNote: null,
  createdAt: "2026-10-12T06:00:00.000Z",
};

const valid = { accountNo: "1234 5678 9012", confirmAccountNo: "123456789012", ifsc: "hdfc0001234" };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  callBackend.mockReset();
  clearSession.mockReset();
  readSessionToken.mockReset();
  readSessionToken.mockResolvedValue("tok");
  callBackend.mockResolvedValue({ ok: true, status: 201, data: { account } });
});

describe("addBankAccountAction", () => {
  it("never spends a penny-drop on invalid input", async () => {
    const attempts = [
      { ...valid, confirmAccountNo: "123456789013" },
      { ...valid, accountNo: "1234", confirmAccountNo: "1234" },
      { ...valid, ifsc: "HDFC1234567" },
      { ...valid, accountNo: "9".repeat(5000), confirmAccountNo: "9".repeat(5000) },
      { accountNo: "", confirmAccountNo: "", ifsc: "" },
    ];
    for (const values of attempts) {
      expect(await addBankAccountAction(form(values))).toMatchObject({ status: "error", code: "validation" });
    }
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("sends only the normalised account number and IFSC", async () => {
    const result = await addBankAccountAction(form({ ...valid, holderName: "Someone Else" }));

    expect(callBackend).toHaveBeenCalledWith("/v1/bank-accounts", {
      method: "POST",
      token: "tok",
      json: { accountNo: "123456789012", ifsc: "HDFC0001234" },
    });
    expect(result).toEqual({ status: "ok", account });
    expect(JSON.stringify(result)).not.toContain("123456789012");
  });

  it("never returns the full account number or a stranger's name for an unverified account", async () => {
    callBackend.mockResolvedValue({
      ok: true,
      status: 201,
      data: { account: { ...account, status: "review", isPrimary: false, accountMasked: "123456789012", nameAtBank: "STRANGER NAME" } },
    });

    const result = await addBankAccountAction(form(valid));

    expect(JSON.stringify(result)).not.toContain("123456789012");
    expect(JSON.stringify(result)).not.toContain("STRANGER NAME");
  });

  it("explains the daily limit with the wait time", async () => {
    callBackend.mockResolvedValue({
      ok: false,
      status: 429,
      error: { code: "rate_limited", message: "Too many bank verification attempts today.", retryAfterSeconds: 7200 },
    });

    const result = await addBankAccountAction(form(valid));

    expect(result).toMatchObject({ status: "error", httpStatus: 429, retryAfterSeconds: 7200 });
    expect(result.status === "error" && result.message).toMatch(/5 verification attempts.*about 2 hours/);
  });

  it("uses our own wording for verification outcomes", async () => {
    const cases = [
      { code: "kyc_not_verified", status: 409, match: /KYC must be verified/ },
      { code: "bank_account_invalid", status: 422, match: /Check the account number and IFSC/ },
      { code: "provider_unavailable", status: 502, match: /not responding/ },
      { code: "conflict", status: 409, match: /already on your profile/ },
    ];
    for (const { code, status, match } of cases) {
      callBackend.mockResolvedValueOnce({ ok: false, status, error: { code, message: "vendor said: raw detail" } });
      const result = await addBankAccountAction(form(valid));
      expect(result).toMatchObject({ status: "error", code, httpStatus: status });
      expect(result.status === "error" && result.message).toMatch(match);
    }
  });

  it("maps backend field errors onto the form", async () => {
    callBackend.mockResolvedValue({
      ok: false,
      status: 400,
      error: { code: "validation", message: "Some fields are invalid", fields: { ifsc: ["Enter a valid IFSC"] } },
    });

    expect(await addBankAccountAction(form(valid))).toMatchObject({ fields: { ifsc: ["Enter a valid IFSC"] } });
  });

  it("clears the cookie when the session has expired", async () => {
    callBackend.mockImplementation(async (path: string) =>
      path === "/v1/ping"
        ? { ok: true, status: 200, data: {} }
        : { ok: false, status: 401, error: { code: "unauthorized", message: "Session expired" } },
    );

    expect(await addBankAccountAction(form(valid))).toMatchObject({ httpStatus: 401, code: "unauthorized" });
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("passes a blocked account through so the portal can sign out", async () => {
    callBackend.mockResolvedValue({ ok: false, status: 403, error: { code: "account_blocked", message: "Blocked" } });

    expect(await addBankAccountAction(form(valid))).toMatchObject({ httpStatus: 403, code: "account_blocked" });
    expect(clearSession).not.toHaveBeenCalled();
  });
});

describe("setPrimaryBankAccountAction", () => {
  it("rejects malformed ids before calling the backend", async () => {
    for (const id of ["", "../kyc", "1", `${accountId}/primary`]) {
      expect(await setPrimaryBankAccountAction(id)).toMatchObject({ status: "error", code: "not_found" });
    }
    expect(callBackend).not.toHaveBeenCalled();
  });

  it("sets the primary account", async () => {
    callBackend.mockResolvedValue({ ok: true, status: 200, data: { account } });

    expect(await setPrimaryBankAccountAction(accountId)).toEqual({ status: "ok", account });
    expect(callBackend).toHaveBeenCalledWith(`/v1/bank-accounts/${accountId}/primary`, { method: "POST", token: "tok" });
  });

  it("explains why an unverified account cannot be primary", async () => {
    callBackend.mockResolvedValue({ ok: false, status: 409, error: { code: "conflict", message: "Only a verified bank account can be primary" } });

    const result = await setPrimaryBankAccountAction(accountId);
    expect(result.status === "error" && result.message).toMatch(/Only a verified bank account/);
  });
});
