import { describe, expect, it, vi } from "vitest";
import { queryKeys } from "./keys";
import { bankAccountsQuery, kycQuery, meQuery, planQuery, plansQuery, walletQuery, walletTransactionsQuery, withdrawalsQuery } from "./options";

describe("queryKeys", () => {
  it("namespaces every key under the app root", () => {
    expect(queryKeys.me()).toEqual(["nextera", "me"]);
    expect(queryKeys.plans.list()).toEqual(["nextera", "plans", "list"]);
    expect(queryKeys.plans.detail("steady-12")).toEqual(["nextera", "plans", "detail", "steady-12"]);
    expect(queryKeys.kyc()).toEqual(["nextera", "kyc"]);
    expect(queryKeys.bankAccounts.list()).toEqual(["nextera", "bank-accounts", "list"]);
    expect(queryKeys.wallet.balance()).toEqual(["nextera", "wallet", "balance"]);
    expect(queryKeys.wallet.withdrawals()).toEqual(["nextera", "wallet", "withdrawals"]);
    expect(queryKeys.wallet.transactions()).toEqual(["nextera", "wallet", "transactions"]);
  });

  it("nests bank account keys under bankAccounts.all", () => {
    const prefix = queryKeys.bankAccounts.all();
    expect(queryKeys.bankAccounts.list().slice(0, prefix.length)).toEqual(prefix);
  });

  it("nests plan keys under plans.all so one invalidation covers list and details", () => {
    const prefix = queryKeys.plans.all();
    expect(queryKeys.plans.list().slice(0, prefix.length)).toEqual(prefix);
    expect(queryKeys.plans.detail("x").slice(0, prefix.length)).toEqual(prefix);
  });

  it("nests wallet keys under wallet.all so one invalidation covers balance, withdrawals and transactions", () => {
    const prefix = queryKeys.wallet.all();
    for (const key of [queryKeys.wallet.balance(), queryKeys.wallet.withdrawals(), queryKeys.wallet.transactions()]) {
      expect(key.slice(0, prefix.length)).toEqual(prefix);
    }
  });
});

describe("shared query options", () => {
  it("reuse the factory keys so server prefetch and client hooks share cache entries", () => {
    expect(meQuery().queryKey).toEqual(queryKeys.me());
    expect(plansQuery().queryKey).toEqual(queryKeys.plans.list());
    expect(planQuery("steady-12").queryKey).toEqual(queryKeys.plans.detail("steady-12"));
    expect(kycQuery().queryKey).toEqual(queryKeys.kyc());
    expect(bankAccountsQuery().queryKey).toEqual(queryKeys.bankAccounts.list());
    expect(walletQuery().queryKey).toEqual(queryKeys.wallet.balance());
    expect(withdrawalsQuery().queryKey).toEqual(queryKeys.wallet.withdrawals());
    expect(walletTransactionsQuery().queryKey).toEqual(queryKeys.wallet.transactions());
  });

  it("refetch verification state on focus because staff can change it at any time", () => {
    expect(kycQuery().refetchOnWindowFocus).toBe(true);
    expect(bankAccountsQuery().refetchOnWindowFocus).toBe(true);
  });

  it("read KYC and bank accounts through same-origin handlers", async () => {
    const fetchMock = vi.fn(async () => Response.json({ kycStatus: "none", profile: null }));
    vi.stubGlobal("fetch", fetchMock);
    const context = { signal: new AbortController().signal } as never;
    await kycQuery().queryFn?.(context);
    await bankAccountsQuery().queryFn?.(context);
    expect(fetchMock.mock.calls.map((call) => (call as unknown[])[0])).toEqual(["/api/kyc", "/api/bank-accounts"]);
    vi.unstubAllGlobals();
  });

  it("let the server swap in a direct loader under the same key", async () => {
    const options = meQuery(async () => ({
      customer: { id: "c1", phone: "+919876543210", name: null, email: null, status: "active", kycStatus: "none" },
    }));
    expect(options.queryKey).toEqual(queryKeys.me());
    expect(options.refetchOnWindowFocus).toBe(true);
  });
});
