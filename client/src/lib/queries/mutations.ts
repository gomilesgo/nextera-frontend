import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { BankAccount, CustomerProfile } from "@nextera/contracts";
import { logoutAction } from "@/app/portal/(app)/actions";
import { addBankAccountAction, removeBankAccountAction, setPrimaryBankAccountAction } from "@/app/portal/(app)/bank/actions";
import { submitKycAction } from "@/app/portal/(app)/kyc/actions";
import { logoutAllAction, updateEmailAction } from "@/app/portal/(app)/profile/actions";
import { cancelWithdrawalAction, requestWithdrawalAction } from "@/app/portal/(app)/wallet/actions";
import { unwrapAction } from "@/lib/actionResult";
import { ApiError } from "@/lib/api/errors";
import { LOGIN_PATH } from "@/lib/sessionCookie";
import { queryKeys } from "./keys";
import type { BankAccountsData, KycData, MeData } from "./options";

export async function syncKyc(queryClient: QueryClient, kyc: KycData): Promise<void> {
  queryClient.setQueryData(queryKeys.kyc(), kyc);
  queryClient.setQueryData<MeData>(queryKeys.me(), (current) =>
    current ? { customer: { ...current.customer, kycStatus: kyc.kycStatus } } : current,
  );
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.me() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts.all() }),
  ]);
}

export async function syncBankAccount(queryClient: QueryClient, account: BankAccount): Promise<void> {
  queryClient.setQueryData<BankAccountsData>(queryKeys.bankAccounts.list(), (current) => {
    if (!current) return current;
    const others = current.accounts.filter((existing) => existing.id !== account.id);
    const demoted = account.isPrimary ? others.map((existing) => ({ ...existing, isPrimary: false })) : others;
    return { accounts: [...demoted, account] };
  });
  await queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts.all() });
}

export async function syncMe(queryClient: QueryClient, customer: CustomerProfile): Promise<void> {
  queryClient.setQueryData<MeData>(queryKeys.me(), { customer });
  await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
}

export async function refreshAfterFailure(queryClient: QueryClient, error: unknown): Promise<void> {
  if (!(error instanceof ApiError)) return;
  if (error.code === "conflict" || error.code === "kyc_not_verified") {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.me() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts.all() }),
    ]);
  }
}

export function useSubmitKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => unwrapAction(await submitKycAction(formData)).kyc,
    onSuccess: (kyc) => syncKyc(queryClient, kyc),
    onError: (error) => refreshAfterFailure(queryClient, error),
  });
}

export function useAddBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => unwrapAction(await addBankAccountAction(formData)).account,
    onSuccess: (account) => syncBankAccount(queryClient, account),
    onError: (error) => refreshAfterFailure(queryClient, error),
  });
}

export function useSetPrimaryBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => unwrapAction(await setPrimaryBankAccountAction(accountId)).account,
    onSuccess: (account) => syncBankAccount(queryClient, account),
    onError: (error) => refreshAfterFailure(queryClient, error),
  });
}

export function useRemoveBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      unwrapAction(await removeBankAccountAction(accountId));
      return accountId;
    },
    onSuccess: async (accountId) => {
      queryClient.setQueryData<BankAccountsData>(queryKeys.bankAccounts.list(), (current) => {
        if (!current) return current;
        return { accounts: current.accounts.filter((a) => a.id !== accountId) };
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts.all() });
    },
  });
}

export function useRequestWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ amountPaise, idempotencyKey }: { amountPaise: number; idempotencyKey: string }) =>
      requestWithdrawalAction(amountPaise, idempotencyKey).then(unwrapAction),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all() }),
      ]);
    },
  });
}

export function useCancelWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (withdrawalId: string) => cancelWithdrawalAction(withdrawalId).then(unwrapAction),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all() });
    },
  });
}

export function useUpdateEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string | null) => updateEmailAction(email).then(unwrapAction),
    onSuccess: (result) => syncMe(queryClient, result.customer),
  });
}

export function useLogoutAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logoutAllAction(),
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.all });
      window.location.replace(`${LOGIN_PATH}?signed_out=1`);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logoutAction(),
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.all });
      window.location.replace(`${LOGIN_PATH}?signed_out=1`);
    },
  });
}
