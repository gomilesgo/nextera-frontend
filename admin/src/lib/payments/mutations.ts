import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolvePaymentFlag } from "@/app/(console)/payment-flags/actions";
import { isNavigationError, runAction } from "@/lib/actions/navigation";
import { unwrapOutcome } from "@/lib/actions/outcome";
import { refreshAfterFailedResolve, syncFlagResolution } from "./cache";
import type { ResolveDraft } from "./resolve";

export function useResolveFlag(flagId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: ResolveDraft) => unwrapOutcome(await runAction(() => resolvePaymentFlag(flagId, draft))),
    onSuccess: (flag) => syncFlagResolution(queryClient, flag),
    onError: (error) => refreshAfterFailedResolve(queryClient, flagId, error),
    throwOnError: isNavigationError,
  });
}
