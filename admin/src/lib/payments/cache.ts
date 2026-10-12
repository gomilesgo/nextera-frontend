import type { QueryClient } from "@tanstack/react-query";
import type { PaymentEvent } from "@nextera/contracts";
import { investmentKeys } from "@/lib/queries/investments";
import { paymentKeys } from "@/lib/queries/payments";
import type { FlagDetailResponse } from "@/lib/queries/payments";
import { resolveErrorCode, shouldRefreshFlag } from "./messages";

export async function syncFlagResolution(queryClient: QueryClient, flag: PaymentEvent): Promise<void> {
  queryClient.setQueryData<FlagDetailResponse>(paymentKeys.flag(flag.id), (current) =>
    current ? { ...current, flag } : current,
  );
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
    queryClient.invalidateQueries({ queryKey: investmentKeys.details() }),
  ]);
}

export async function refreshAfterFailedResolve(queryClient: QueryClient, flagId: string, error: unknown): Promise<void> {
  if (!shouldRefreshFlag(resolveErrorCode(error))) return;
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: paymentKeys.flag(flagId) }),
    queryClient.invalidateQueries({ queryKey: paymentKeys.flags() }),
  ]);
}
