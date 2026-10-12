import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type {
  AdminWithdrawalDetail,
  AdminWithdrawalListResponse,
  PayoutBatchDetail,
  PayoutBatchListResponse,
} from "@nextera/contracts";
import { withdrawalListSearch, batchListSearch } from "@/lib/withdrawals/filters";
import type { WithdrawalListFilters } from "@/lib/withdrawals/filters";
import { withSearch } from "@/lib/listing/params";
import { fetchJson } from "./fetchJson";

export const WITHDRAWAL_STALE_MS = 30_000;

export type WithdrawalListPage = AdminWithdrawalListResponse;
export type WithdrawalDetailResponse = AdminWithdrawalDetail;
export type BatchListPage = PayoutBatchListResponse;
export type BatchDetailResponse = PayoutBatchDetail;

export const withdrawalKeys = {
  all: ["withdrawals"] as const,
  lists: () => [...withdrawalKeys.all, "list"] as const,
  list: (filters: WithdrawalListFilters) => [...withdrawalKeys.lists(), filters] as const,
  details: () => [...withdrawalKeys.all, "detail"] as const,
  detail: (id: string) => [...withdrawalKeys.details(), id] as const,
  batches: () => [...withdrawalKeys.all, "batches"] as const,
  batchList: () => [...withdrawalKeys.batches(), "list"] as const,
  batchDetail: (id: string) => [...withdrawalKeys.batches(), "detail", id] as const,
};

function isProcessingList(data: { pages: WithdrawalListPage[] } | undefined): boolean {
  return Boolean(data?.pages.some((p) => p.withdrawals.some((w) => w.status === "processing")));
}

function isProcessingDetail(data: WithdrawalDetailResponse | undefined): boolean {
  return data?.withdrawal.status === "processing";
}

function isBatchActive(data: BatchDetailResponse | undefined): boolean {
  const s = data?.batch.status;
  return s === "submitted" || s === "unconfirmed";
}

function isBatchListActive(data: { pages: BatchListPage[] } | undefined): boolean {
  return Boolean(data?.pages.some((p) => p.batches.some((b) => b.status === "submitted" || b.status === "unconfirmed")));
}

export const withdrawalQueries = {
  list: (filters: WithdrawalListFilters) =>
    infiniteQueryOptions({
      queryKey: withdrawalKeys.list(filters),
      queryFn: ({ pageParam }) =>
        fetchJson<WithdrawalListPage>(
          withSearch("/api/withdrawals", withdrawalListSearch(filters, pageParam as string | null)),
        ),
      initialPageParam: null as string | null,
      getNextPageParam: (page: WithdrawalListPage) => page.nextCursor ?? undefined,
      staleTime: WITHDRAWAL_STALE_MS,
      refetchInterval: (query) => (isProcessingList(query.state.data) ? 30_000 : false),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: withdrawalKeys.detail(id),
      queryFn: () => fetchJson<WithdrawalDetailResponse>(`/api/withdrawals/${encodeURIComponent(id)}`),
      staleTime: WITHDRAWAL_STALE_MS,
      refetchInterval: (query) => (isProcessingDetail(query.state.data) ? 30_000 : false),
      refetchOnWindowFocus: "always",
    }),
  batchList: () =>
    infiniteQueryOptions({
      queryKey: withdrawalKeys.batchList(),
      queryFn: ({ pageParam }) =>
        fetchJson<BatchListPage>(withSearch("/api/withdrawals/batches", batchListSearch(pageParam as string | null))),
      initialPageParam: null as string | null,
      getNextPageParam: (page: BatchListPage) => page.nextCursor ?? undefined,
      staleTime: WITHDRAWAL_STALE_MS,
      refetchInterval: (query) => (isBatchListActive(query.state.data) ? 30_000 : false),
    }),
  batchDetail: (id: string) =>
    queryOptions({
      queryKey: withdrawalKeys.batchDetail(id),
      queryFn: () => fetchJson<BatchDetailResponse>(`/api/withdrawals/batches/${encodeURIComponent(id)}`),
      staleTime: WITHDRAWAL_STALE_MS,
      refetchInterval: (query) => (isBatchActive(query.state.data) ? 30_000 : false),
      refetchOnWindowFocus: "always",
    }),
};
