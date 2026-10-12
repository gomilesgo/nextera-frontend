import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";

export async function syncBankDecision(queryClient: QueryClient, customerId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.bank.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.kyc.customer(customerId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) }),
  ]);
}
