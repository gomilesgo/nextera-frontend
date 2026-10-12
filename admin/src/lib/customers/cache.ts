import type { QueryClient } from "@tanstack/react-query";
import type { AdminCustomer, AdminCustomerDetail, ManualAdjustmentResponse } from "@nextera/contracts";
import { isNavigationError } from "@/lib/actions/navigation";
import { auditKeys } from "@/lib/queries/audit";
import { customerKeys } from "@/lib/queries/customers";
import { adjustmentOutcomeUnknown } from "./messages";
import { ActionError, CustomerActionError } from "@/lib/actions/outcome";

export async function syncCustomer(queryClient: QueryClient, customer: AdminCustomer): Promise<void> {
  queryClient.setQueryData<AdminCustomerDetail>(customerKeys.detail(customer.id), (current) =>
    current ? { ...current, customer } : current,
  );
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: customerKeys.detail(customer.id) }),
    queryClient.invalidateQueries({ queryKey: customerKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: auditKeys.all }),
  ]);
}

export async function rememberCreatedCustomer(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: customerKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: auditKeys.all }),
  ]);
}

export function applyWalletBalance(detail: AdminCustomerDetail, balancePaise: number): AdminCustomerDetail {
  const hasWallet = detail.balances.some((balance) => balance.account === "wallet");
  const balances = hasWallet
    ? detail.balances.map((balance) => (balance.account === "wallet" ? { ...balance, balancePaise } : balance))
    : [...detail.balances, { account: "wallet", balancePaise }].sort((a, b) => a.account.localeCompare(b.account));
  return { ...detail, balances, totalBalancePaise: balances.reduce((sum, balance) => sum + balance.balancePaise, 0) };
}

export async function syncAdjustment(
  queryClient: QueryClient,
  customerId: string,
  result: ManualAdjustmentResponse,
): Promise<void> {
  queryClient.setQueryData<AdminCustomerDetail>(customerKeys.detail(customerId), (current) =>
    current ? applyWalletBalance(current, result.balancePaise) : current,
  );
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) }),
    queryClient.invalidateQueries({ queryKey: customerKeys.ledgers(customerId) }),
    queryClient.invalidateQueries({ queryKey: auditKeys.all }),
  ]);
}

export async function syncAdjustmentFailure(
  queryClient: QueryClient,
  customerId: string,
  error: unknown,
): Promise<void> {
  const failure = actionError(error);
  if (!failure) return;
  const uncertain = adjustmentOutcomeUnknown(failure.code);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) }),
    uncertain ? queryClient.invalidateQueries({ queryKey: customerKeys.ledgers(customerId) }) : null,
    uncertain ? queryClient.invalidateQueries({ queryKey: auditKeys.all }) : null,
  ]);
}

export function actionError(error: unknown): CustomerActionError | null {
  if (!error || isNavigationError(error)) return null;
  if (error instanceof CustomerActionError) return error;
  if (error instanceof ActionError) {
    return new CustomerActionError({ code: error.code ?? "unavailable", message: error.message, errors: error.errors });
  }
  return new CustomerActionError({
    code: "unavailable",
    message: "Could not reach the console server. Please try again.",
  });
}
