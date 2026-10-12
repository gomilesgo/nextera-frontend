import { queryOptions } from "@tanstack/react-query";
import type { BankAccount, CustomerProfile, Plan, WalletResponse, WalletTransactionPage, Withdrawal, WithdrawalListResponse } from "@nextera/contracts";
import type { PortalKyc } from "@/lib/kyc";
import { fetchApi } from "./fetchApi";
import { queryKeys } from "./keys";

export type MeData = { customer: CustomerProfile };
export type PlansData = { plans: Plan[] };
export type PlanData = { plan: Plan };
export type KycData = PortalKyc;
export type BankAccountsData = { accounts: BankAccount[] };
export type WalletData = WalletResponse;
export type WithdrawalsData = { withdrawals: Withdrawal[]; nextCursor: string | null };
export type WalletTransactionsData = WalletTransactionPage;

type Loader<T> = (signal?: AbortSignal) => Promise<T>;

export const ME_STALE_MS = 30_000;
export const PLANS_STALE_MS = 5 * 60_000;
export const ONBOARDING_STALE_MS = 30_000;
export const WALLET_STALE_MS = 15_000;

export function meQuery(load: Loader<MeData> = (signal) => fetchApi<MeData>("/api/me", signal)) {
  return queryOptions({
    queryKey: queryKeys.me(),
    queryFn: ({ signal }) => load(signal),
    staleTime: ME_STALE_MS,
    refetchOnWindowFocus: true,
  });
}

export function plansQuery(load: Loader<PlansData> = (signal) => fetchApi<PlansData>("/api/plans", signal)) {
  return queryOptions({
    queryKey: queryKeys.plans.list(),
    queryFn: ({ signal }) => load(signal),
    staleTime: PLANS_STALE_MS,
  });
}

export function planQuery(
  slug: string,
  load: Loader<PlanData> = (signal) => fetchApi<PlanData>(`/api/plans/${encodeURIComponent(slug)}`, signal),
) {
  return queryOptions({
    queryKey: queryKeys.plans.detail(slug),
    queryFn: ({ signal }) => load(signal),
    staleTime: PLANS_STALE_MS,
  });
}

export function kycQuery(load: Loader<KycData> = (signal) => fetchApi<KycData>("/api/kyc", signal)) {
  return queryOptions({
    queryKey: queryKeys.kyc(),
    queryFn: ({ signal }) => load(signal),
    staleTime: ONBOARDING_STALE_MS,
    refetchOnWindowFocus: true,
  });
}

export function bankAccountsQuery(
  load: Loader<BankAccountsData> = (signal) => fetchApi<BankAccountsData>("/api/bank-accounts", signal),
) {
  return queryOptions({
    queryKey: queryKeys.bankAccounts.list(),
    queryFn: ({ signal }) => load(signal),
    staleTime: ONBOARDING_STALE_MS,
    refetchOnWindowFocus: true,
  });
}

export function walletQuery(load: Loader<WalletData> = (signal) => fetchApi<WalletData>("/api/wallet", signal)) {
  return queryOptions({
    queryKey: queryKeys.wallet.balance(),
    queryFn: ({ signal }) => load(signal),
    staleTime: WALLET_STALE_MS,
    refetchOnWindowFocus: true,
  });
}

export function withdrawalsQuery(
  load: Loader<WithdrawalsData> = (signal) => fetchApi<WithdrawalsData>("/api/wallet/withdrawals", signal),
) {
  return queryOptions({
    queryKey: queryKeys.wallet.withdrawals(),
    queryFn: ({ signal }) => load(signal),
    staleTime: WALLET_STALE_MS,
    refetchOnWindowFocus: true,
  });
}

export function walletTransactionsQuery(
  load: Loader<WalletTransactionsData> = (signal) =>
    fetchApi<WalletTransactionsData>("/api/wallet/transactions", signal),
) {
  return queryOptions({
    queryKey: queryKeys.wallet.transactions(),
    queryFn: ({ signal }) => load(signal),
    staleTime: WALLET_STALE_MS,
    refetchOnWindowFocus: true,
  });
}

export type { WithdrawalListResponse };
