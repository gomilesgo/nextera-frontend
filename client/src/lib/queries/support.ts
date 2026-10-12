import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { TicketDetailResponse, TicketListResponse, TicketStatus } from "@nextera/contracts";
import { ticketListQuery } from "@/lib/support/requests";
import { fetchApi } from "./fetchApi";
import { queryKeys } from "./keys";

export const SUPPORT_STALE_MS = 30_000;

export const supportKeys = {
  all: () => [...queryKeys.all, "support"] as const,
  lists: () => [...supportKeys.all(), "list"] as const,
  list: (status: TicketStatus | null) => [...supportKeys.lists(), status ?? "all"] as const,
  details: () => [...supportKeys.all(), "detail"] as const,
  detail: (id: string) => [...supportKeys.details(), id] as const,
};

type PageLoader = (cursor: string | null, signal?: AbortSignal) => Promise<TicketListResponse>;
type DetailLoader = (signal?: AbortSignal) => Promise<TicketDetailResponse>;

export function ticketsQuery(
  status: TicketStatus | null,
  load: PageLoader = (cursor, signal) =>
    fetchApi<TicketListResponse>(`/api/support/tickets?${ticketListQuery(status, cursor)}`, signal),
) {
  return infiniteQueryOptions({
    queryKey: supportKeys.list(status),
    queryFn: ({ pageParam, signal }) => load(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: SUPPORT_STALE_MS,
    refetchOnWindowFocus: true,
  });
}

export function ticketQuery(
  id: string,
  load: DetailLoader = (signal) =>
    fetchApi<TicketDetailResponse>(`/api/support/tickets/${encodeURIComponent(id)}`, signal),
) {
  return queryOptions({
    queryKey: supportKeys.detail(id),
    queryFn: ({ signal }) => load(signal),
    staleTime: SUPPORT_STALE_MS,
    refetchOnWindowFocus: true,
  });
}
