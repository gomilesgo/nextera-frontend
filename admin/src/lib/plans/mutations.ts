import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlanStatus } from "@nextera/contracts";
import { changePlanStatus, createPlan, deletePlan, updatePlan } from "@/app/(console)/plans/actions";
import { PlanActionError, forgetPlan, isNavigationError, runAction, syncPlan, unwrapPlan } from "./cache";

export function useSavePlan(planId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) =>
      unwrapPlan(await runAction(() => (planId ? updatePlan(planId, formData) : createPlan(formData)))),
    onSuccess: (plan) => syncPlan(queryClient, plan),
    throwOnError: isNavigationError,
  });
}

export function useChangePlanStatus(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: Exclude<PlanStatus, "draft">) =>
      unwrapPlan(await runAction(() => changePlanStatus(planId, status))),
    onSuccess: (plan) => syncPlan(queryClient, plan),
    throwOnError: isNavigationError,
  });
}

export function useDeletePlan(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await runAction(() => deletePlan(planId));
      if (result.status === "error") throw new PlanActionError(result.message);
    },
    onSuccess: () => forgetPlan(queryClient, planId),
    throwOnError: isNavigationError,
  });
}
