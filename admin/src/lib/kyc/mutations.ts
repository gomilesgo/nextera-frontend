import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveKyc, rejectKyc } from "@/app/(console)/kyc/actions";
import { isNavigationError, runAction } from "@/lib/actions/navigation";
import { unwrapOutcome } from "@/lib/actions/outcome";
import { syncKycDecision } from "./cache";

export type KycDecision = { kind: "approve" } | { kind: "reject"; reason: string };

export function useKycDecision(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (decision: KycDecision) =>
      unwrapOutcome(
        await runAction(() =>
          decision.kind === "approve" ? approveKyc(customerId) : rejectKyc(customerId, decision.reason),
        ),
      ),
    onSuccess: () => syncKycDecision(queryClient, customerId),
    throwOnError: isNavigationError,
  });
}
