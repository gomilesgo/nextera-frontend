import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import { withdrawalKeys } from "@/lib/queries/withdrawals";

export async function invalidateWithdrawal(queryClient: QueryClient, id: string, customerId?: string): Promise<void> {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: withdrawalKeys.detail(id) }),
    queryClient.invalidateQueries({ queryKey: withdrawalKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: withdrawalKeys.batchList() }),
  ];
  if (customerId) {
    tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) }));
  }
  await Promise.all(tasks);
}

export async function invalidateWithdrawals(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: withdrawalKeys.all });
}

export async function invalidateBatch(queryClient: QueryClient, batchId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: withdrawalKeys.batchDetail(batchId) }),
    queryClient.invalidateQueries({ queryKey: withdrawalKeys.batchList() }),
    queryClient.invalidateQueries({ queryKey: withdrawalKeys.lists() }),
  ]);
}
