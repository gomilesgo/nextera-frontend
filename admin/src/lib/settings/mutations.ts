import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { Settings } from "@nextera/contracts";
import { updateSettings } from "@/app/(console)/settings/actions";
import { isNavigationError, runAction } from "@/lib/actions/navigation";
import { unwrapOutcome } from "@/lib/actions/outcome";
import { queryKeys } from "@/lib/queries/keys";

export async function syncSettings(queryClient: QueryClient, settings: Settings): Promise<void> {
  queryClient.setQueryData(queryKeys.settings.current(), { settings });
  await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => unwrapOutcome(await runAction(() => updateSettings(formData))),
    onSuccess: ({ settings }) => syncSettings(queryClient, settings),
    throwOnError: isNavigationError,
  });
}
