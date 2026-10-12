import type { QueryClient } from "@tanstack/react-query";
import type { Plan } from "@nextera/contracts";
import { isNavigationError, runAction } from "@/lib/actions/navigation";
import { queryKeys } from "@/lib/queries/keys";
import type { PlanFormErrors } from "./form";

export class PlanActionError extends Error {
  readonly errors: PlanFormErrors;

  constructor(message: string, errors: PlanFormErrors = {}) {
    super(message);
    this.name = "PlanActionError";
    this.errors = errors;
  }
}

export type PlanActionOutcome =
  | { status: "ok"; plan: Plan }
  | { status: "error"; message: string; errors?: PlanFormErrors };

export function unwrapPlan(result: PlanActionOutcome): Plan {
  if (result.status === "error") throw new PlanActionError(result.message, result.errors);
  return result.plan;
}

export async function syncPlan(queryClient: QueryClient, plan: Plan): Promise<void> {
  queryClient.setQueryData(queryKeys.plans.detail(plan.id), { plan });
  await queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
}

export async function forgetPlan(queryClient: QueryClient, planId: string): Promise<void> {
  queryClient.removeQueries({ queryKey: queryKeys.plans.detail(planId) });
  await queryClient.invalidateQueries({ queryKey: queryKeys.plans.list() });
}

export { isNavigationError, runAction };

export function errorMessage(error: unknown): string | null {
  if (!error || isNavigationError(error)) return null;
  if (error instanceof PlanActionError) return error.message;
  return "Could not reach the console server. Please try again.";
}
