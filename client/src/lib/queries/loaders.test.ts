import { beforeEach, describe, expect, it, vi } from "vitest";
import { dehydrate } from "@tanstack/react-query";

const callBackend = vi.fn();
const redirect = vi.fn((location: string) => {
  throw Object.assign(new Error("NEXT_REDIRECT"), { location });
});

vi.mock("@/lib/backend/server", () => ({
  callBackend: (...args: unknown[]) => callBackend(...args),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-nextera-path": "/portal/bank?tab=1" }),
}));

vi.mock("next/navigation", () => ({
  redirect: (location: string) => redirect(location),
}));

const { loadBankAccounts, loadKyc } = await import("./loaders");
const { makeQueryClient } = await import("./client");
const { bankAccountsQuery, kycQuery } = await import("./options");

const profile = {
  panMasked: "ABCDE1234F",
  panName: "Asha Rao",
  dob: "1990-05-17",
  address: { line1: "12 Lake View Road", line2: "", city: "Hyderabad", state: "Telangana", pincode: "500034" },
  submittedAt: "2026-10-10T05:00:00.000Z",
  verifiedAt: "2026-10-11T05:00:00.000Z",
  rejectionReason: null,
};

const leakyAccount = {
  id: "7f0c1c2e-1b7a-4d55-9a37-1f0f5b6a2c11",
  accountMasked: "123456789012",
  accountNo: "123456789012",
  accountLast4: "9012",
  ifsc: "HDFC0001234",
  holderName: "Asha Rao",
  nameAtBank: "STRANGER NAME",
  nameMatchResult: "POOR_PARTIAL_MATCH",
  status: "review",
  isPrimary: false,
  verifiedAt: null,
  reviewNote: null,
  createdAt: "2026-10-11T06:00:00.000Z",
};

beforeEach(() => {
  callBackend.mockReset();
  redirect.mockClear();
});

describe("page loaders", () => {
  it("keep full PANs, account numbers, stranger names and withheld details out of the dehydrated state", async () => {
    callBackend.mockImplementation(async (path: string) =>
      path === "/v1/kyc"
        ? { ok: true, status: 200, data: { kycStatus: "verified", profile } }
        : { ok: true, status: 200, data: { accounts: [leakyAccount] } },
    );
    const queryClient = makeQueryClient({ server: true });

    await queryClient.fetchQuery(kycQuery(() => loadKyc("tok")));
    await queryClient.fetchQuery(bankAccountsQuery(() => loadBankAccounts("tok")));
    const state = JSON.stringify(dehydrate(queryClient));

    expect(callBackend).toHaveBeenCalledWith("/v1/kyc", { token: "tok" });
    for (const secret of ["ABCDE1234F", "123456789012", "STRANGER NAME", "Lake View", "1990-05-17"]) {
      expect(state).not.toContain(secret);
    }
    expect(state).toContain("XXXXXX234F");
    expect(state).toContain("9012");
  });

  it("send an expired session to login with the current path", async () => {
    callBackend.mockImplementation(async (path: string) =>
      path === "/v1/ping"
        ? { ok: true, status: 200, data: {} }
        : { ok: false, status: 401, error: { code: "unauthorized", message: "Session expired" } },
    );

    await expect(loadKyc("tok")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/portal/login?expired=1&next=%2Fportal%2Fbank%3Ftab%3D1");
    await expect(loadBankAccounts("tok")).rejects.toThrow("NEXT_REDIRECT");
  });

  it("do not sign customers out when the service key is rejected", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    callBackend.mockResolvedValue({ ok: false, status: 401, error: { code: "unauthorized", message: "Missing or invalid service key" } });

    await expect(loadKyc("tok")).rejects.toThrow(/unavailable/);
    expect(redirect).not.toHaveBeenCalled();
    errorLog.mockRestore();
  });
});
