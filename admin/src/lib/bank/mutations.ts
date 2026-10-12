import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveBankAccount, rejectBankAccount } from "@/app/(console)/bank-accounts/actions";
import { isNavigationError, runAction } from "@/lib/actions/navigation";
import { unwrapOutcome } from "@/lib/actions/outcome";
import { syncBankDecision } from "./cache";

export type BankDecision = { kind: "approve" } | { kind: "reject"; reason: string };

export function useBankDecision(accountId: string, customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (decision: BankDecision) =>
      unwrapOutcome(
        await runAction(() =>
          decision.kind === "approve" ? approveBankAccount(accountId) : rejectBankAccount(accountId, decision.reason),
        ),
      ),
    onSuccess: () => syncBankDecision(queryClient, customerId),
    throwOnError: isNavigationError,
  });
}
