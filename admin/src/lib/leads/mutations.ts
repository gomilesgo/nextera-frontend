import { useMutation, useQueryClient } from "@tanstack/react-query";
import { convertLead, createLead, updateLead } from "@/app/(console)/leads/actions";
import { isNavigationError, runAction } from "@/lib/actions/navigation";
import { unwrapOutcome } from "@/lib/actions/outcome";
import type { LeadPatchInput } from "./form";
import { syncConversion, syncLead } from "./cache";

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => unwrapOutcome(await runAction(() => createLead(formData))),
    onSuccess: (lead) => syncLead(queryClient, lead),
    throwOnError: isNavigationError,
  });
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: LeadPatchInput) => unwrapOutcome(await runAction(() => updateLead(id, patch))),
    onSuccess: (lead) => syncLead(queryClient, lead),
    throwOnError: isNavigationError,
  });
}

export function useConvertLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrapOutcome(await runAction(() => convertLead(id))),
    onSuccess: (result) => syncConversion(queryClient, result),
    throwOnError: isNavigationError,
  });
}
