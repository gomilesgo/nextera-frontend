import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  changeCustomerStatus,
  createCustomer,
  postManualAdjustment,
  revokeCustomerSessions,
  updateCustomer,
} from "@/app/(console)/customers/actions";
import { unwrapOutcome } from "@/lib/actions/outcome";
import { isNavigationError, runAction } from "@/lib/actions/navigation";
import type { AdjustmentFormValues } from "./adjustment";
import { rememberCreatedCustomer, syncAdjustment, syncAdjustmentFailure, syncCustomer } from "./cache";
import type { CustomerStatusAction } from "./form";

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => unwrapOutcome(await runAction(() => createCustomer(formData))),
    onSuccess: () => rememberCreatedCustomer(queryClient),
    throwOnError: isNavigationError,
  });
}

export function useUpdateCustomer(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => unwrapOutcome(await runAction(() => updateCustomer(customerId, formData))),
    onSuccess: (customer) => syncCustomer(queryClient, customer),
    throwOnError: isNavigationError,
  });
}

export function useChangeCustomerStatus(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, reason }: { action: CustomerStatusAction; reason: string }) =>
      unwrapOutcome(await runAction(() => changeCustomerStatus(customerId, action, reason))),
    onSuccess: (customer) => syncCustomer(queryClient, customer),
    throwOnError: isNavigationError,
  });
}

export function useRevokeCustomerSessions(customerId: string) {
  return useMutation({
    mutationFn: async () => unwrapOutcome(await runAction(() => revokeCustomerSessions(customerId))),
    throwOnError: isNavigationError,
  });
}

export function useManualAdjustment(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: AdjustmentFormValues) =>
      unwrapOutcome(await runAction(() => postManualAdjustment(customerId, values))),
    onSuccess: (result) => syncAdjustment(queryClient, customerId, result),
    onError: (error) => syncAdjustmentFailure(queryClient, customerId, error),
    throwOnError: isNavigationError,
  });
}
