import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { BankAccount, CustomerProfile } from "@nextera/contracts";
import { ApiError } from "@/lib/api/errors";

vi.mock("@/app/portal/(app)/actions", () => ({ logoutAction: vi.fn() }));
vi.mock("@/app/portal/(app)/bank/actions", () => ({
  addBankAccountAction: vi.fn(),
  setPrimaryBankAccountAction: vi.fn(),
  removeBankAccountAction: vi.fn(),
}));
vi.mock("@/app/portal/(app)/kyc/actions", () => ({ submitKycAction: vi.fn() }));
vi.mock("@/app/portal/(app)/profile/actions", () => ({ logoutAllAction: vi.fn(), updateEmailAction: vi.fn() }));
vi.mock("@/app/portal/(app)/wallet/actions", () => ({
  requestWithdrawalAction: vi.fn(),
  cancelWithdrawalAction: vi.fn(),
}));

const { refreshAfterFailure, syncBankAccount, syncKyc, syncMe } = await import("./mutations");
const { queryKeys } = await import("./keys");

const customer = { id: "c1", phone: "+919876543210", name: null, email: null, status: "active" as const, kycStatus: "rejected" as const };

const account: BankAccount = {
  id: "a1",
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

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, queryFn: async () => null } } });
}

describe("syncKyc", () => {
  it("stores the new KYC, patches the profile status and invalidates profile and bank accounts", async () => {
    const queryClient = client();
    queryClient.setQueryData(queryKeys.me(), { customer });
    queryClient.setQueryData(queryKeys.bankAccounts.list(), { accounts: [account] });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const kyc = { kycStatus: "submitted" as const, profile: null };

    await syncKyc(queryClient, kyc);

    expect(queryClient.getQueryData(queryKeys.kyc())).toEqual(kyc);
    expect(queryClient.getQueryData(queryKeys.me())).toEqual({ customer: { ...customer, kycStatus: "submitted" } });
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([queryKeys.me(), queryKeys.bankAccounts.all()]);
  });

  it("leaves a missing profile alone", async () => {
    const queryClient = client();
    await syncKyc(queryClient, { kycStatus: "submitted", profile: null });
    expect(queryClient.getQueryData(queryKeys.me())).toBeUndefined();
  });
});

describe("syncBankAccount", () => {
  it("replaces the account and demotes the old primary", async () => {
    const queryClient = client();
    const other: BankAccount = { ...account, id: "a2", accountLast4: "6677", accountMasked: "XXXX6677" };
    queryClient.setQueryData(queryKeys.bankAccounts.list(), { accounts: [account, { ...other, isPrimary: false }] });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();

    await syncBankAccount(queryClient, { ...other, isPrimary: true });

    const data = queryClient.getQueryData<{ accounts: BankAccount[] }>(queryKeys.bankAccounts.list());
    expect(data?.accounts.map((item) => [item.id, item.isPrimary])).toEqual([
      ["a1", false],
      ["a2", true],
    ]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.bankAccounts.all() });
  });

  it("appends a new account without touching the existing primary", async () => {
    const queryClient = client();
    queryClient.setQueryData(queryKeys.bankAccounts.list(), { accounts: [account] });
    vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();

    await syncBankAccount(queryClient, { ...account, id: "a3", status: "review", isPrimary: false });

    const data = queryClient.getQueryData<{ accounts: BankAccount[] }>(queryKeys.bankAccounts.list());
    expect(data?.accounts.map((item) => [item.id, item.isPrimary])).toEqual([
      ["a1", true],
      ["a3", false],
    ]);
  });
});

describe("refreshAfterFailure", () => {
  it("refreshes KYC, profile and bank accounts after a conflict or a KYC gate", async () => {
    for (const code of ["conflict", "kyc_not_verified"]) {
      const queryClient = client();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
      await refreshAfterFailure(queryClient, new ApiError(409, code, "x"));
      expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
        queryKeys.kyc(),
        queryKeys.me(),
        queryKeys.bankAccounts.all(),
      ]);
    }
  });

  it("ignores other failures", async () => {
    const queryClient = client();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await refreshAfterFailure(queryClient, new ApiError(400, "validation", "x"));
    await refreshAfterFailure(queryClient, new Error("network"));
    expect(invalidate).not.toHaveBeenCalled();
  });
});

const meCustomer: CustomerProfile = {
  id: "c1",
  phone: "+919876543210",
  name: "Asha Rao",
  email: "asha@example.com",
  status: "active",
  kycStatus: "verified",
};

describe("syncMe", () => {
  it("writes the customer directly and invalidates the me query", async () => {
    const queryClient = client();
    const { queryKeys } = await import("./keys");
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await syncMe(queryClient, meCustomer);
    expect(queryClient.getQueryData(queryKeys.me())).toEqual({ customer: meCustomer });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.me() });
  });
});
