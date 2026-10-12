import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";

export async function syncKycDecision(queryClient: QueryClient, customerId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.kyc.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.bank.queues() }),
  ]);
}
