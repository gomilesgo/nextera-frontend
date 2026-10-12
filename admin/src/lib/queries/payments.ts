import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { AdminPayment, AdminPaymentListResponse, PaymentEvent, PaymentFlagListResponse, PaymentStatus } from "@nextera/contracts";
import { FLAG_LOOKUP_LIMIT } from "@/lib/payments/filters";
import type { FlagState } from "@/lib/payments/filters";
import { toSearchString, withSearch } from "@/lib/listing/params";
import { fetchJson } from "./fetchJson";

export const PAYMENT_STALE_MS = 15_000;
export const FLAG_COUNT_STALE_MS = 60_000;

export type PaymentListQuery = { status?: PaymentStatus; limit: number };
export type FlagListQuery = { state: FlagState; limit: number };
export type PaymentListResponse = AdminPaymentListResponse;
export type FlagListResponse = PaymentFlagListResponse;
export type FlagDetailResponse = { flag: PaymentEvent; payment: AdminPayment | null };
export type PaymentDetailResponse = { payment: AdminPayment };

export const paymentKeys = {
  all: ["payments"] as const,
  lists: () => [...paymentKeys.all, "list"] as const,
  list: (query: PaymentListQuery) => [...paymentKeys.lists(), query.status ?? "all", query.limit] as const,
  details: () => [...paymentKeys.all, "detail"] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
  flags: () => [...paymentKeys.all, "flags"] as const,
  flagLists: () => [...paymentKeys.flags(), "list"] as const,
  flagList: (query: FlagListQuery) => [...paymentKeys.flagLists(), query.state, query.limit] as const,
  flag: (id: string) => [...paymentKeys.flags(), "detail", id] as const,
  openFlagCount: () => [...paymentKeys.flags(), "open-count"] as const,
};

export function openFlagCount(response: FlagListResponse): number {
  return response.total;
}

export function flagCountLabel(count: number): string {
  return count >= FLAG_LOOKUP_LIMIT ? `${FLAG_LOOKUP_LIMIT}+` : String(count);
}

export const paymentQueries = {
  list: (query: PaymentListQuery) =>
    queryOptions({
      queryKey: paymentKeys.list(query),
      queryFn: () => fetchJson<PaymentListResponse>(withSearch("/api/payments", toSearchString(query))),
      staleTime: PAYMENT_STALE_MS,
      placeholderData: keepPreviousData,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: paymentKeys.detail(id),
      queryFn: () => fetchJson<PaymentDetailResponse>(`/api/payments/${encodeURIComponent(id)}`),
      staleTime: PAYMENT_STALE_MS,
    }),
  flagList: (query: FlagListQuery) =>
    queryOptions({
      queryKey: paymentKeys.flagList(query),
      queryFn: () => fetchJson<FlagListResponse>(withSearch("/api/payments/flags", toSearchString(query))),
      staleTime: PAYMENT_STALE_MS,
      placeholderData: keepPreviousData,
    }),
  flag: (id: string) =>
    queryOptions({
      queryKey: paymentKeys.flag(id),
      queryFn: () => fetchJson<FlagDetailResponse>(`/api/payments/flags/${encodeURIComponent(id)}`),
      staleTime: PAYMENT_STALE_MS,
    }),
  openFlagCount: () =>
    queryOptions({
      queryKey: paymentKeys.openFlagCount(),
      queryFn: () => fetchJson<FlagListResponse>(withSearch("/api/payments/flags", toSearchString({ state: "open", limit: FLAG_LOOKUP_LIMIT }))),
      select: openFlagCount,
      staleTime: FLAG_COUNT_STALE_MS,
    }),
};
