import { queryOptions } from "@tanstack/react-query";
import type { Investment, InvestmentDetail, PaymentStatusResponse } from "@nextera/contracts";
import { isClientError } from "@/lib/api/errors";
import type { InvestmentSummary } from "@/lib/investmentSummary";
import { paymentView, pollInterval } from "@/lib/paymentPolling";
import { fetchApi } from "./fetchApi";
import { queryKeys } from "./keys";

export type InvestmentsData = { investments: Investment[] };
export type InvestmentSummaryData = { summary: InvestmentSummary };
export type InvestmentData = InvestmentDetail;
export type PaymentStatusData = PaymentStatusResponse;

type Loader<T> = (signal?: AbortSignal) => Promise<T>;

export const INVESTMENTS_STALE_MS = 30_000;

export function investmentsQuery(
  load: Loader<InvestmentsData> = (signal) => fetchApi<InvestmentsData>("/api/investments", signal),
) {
  return queryOptions({
    queryKey: queryKeys.investments.list(),
    queryFn: ({ signal }) => load(signal),
    staleTime: INVESTMENTS_STALE_MS,
    refetchOnWindowFocus: true,
  });
}

export function investmentSummaryQuery(
  load: Loader<InvestmentSummaryData> = (signal) => fetchApi<InvestmentSummaryData>("/api/investments/summary", signal),
) {
  return queryOptions({
    queryKey: queryKeys.investments.summary(),
    queryFn: ({ signal }) => load(signal),
    staleTime: INVESTMENTS_STALE_MS,
    refetchOnWindowFocus: true,
  });
}

export function investmentQuery(
  id: string,
  load: Loader<InvestmentData> = (signal) => fetchApi<InvestmentData>(`/api/investments/${encodeURIComponent(id)}`, signal),
) {
  return queryOptions({
    queryKey: queryKeys.investments.detail(id),
    queryFn: ({ signal }) => load(signal),
    staleTime: INVESTMENTS_STALE_MS,
    refetchOnWindowFocus: true,
  });
}

export function paymentStatusQuery(
  id: string,
  options: { startedAt: number; now?: () => number },
  load: Loader<PaymentStatusData> = (signal) =>
    fetchApi<PaymentStatusData>(`/api/investments/${encodeURIComponent(id)}/payment`, signal),
) {
  const now = options.now ?? Date.now;
  return queryOptions({
    queryKey: queryKeys.investments.payment(id),
    queryFn: ({ signal }) => load(signal),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      if (query.state.error && isClientError(query.state.error)) return false;
      const data = query.state.data;
      return pollInterval(data ? paymentView(data) : null, now() - options.startedAt);
    },
  });
}
