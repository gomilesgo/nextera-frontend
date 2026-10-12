import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { AdminTicketDetailResponse, AdminTicketListResponse } from "@nextera/contracts";
import { toSearch } from "@/lib/filters";
import type { TicketListParams } from "@/lib/support/filters";
import { fetchJson } from "./fetchJson";

export const TICKETS_PAGE_SIZE = 50;
export const TICKETS_STALE_MS = 15_000;
export const TICKET_DETAIL_STALE_MS = 10_000;

export const supportKeys = {
  all: ["support"] as const,
  lists: () => [...supportKeys.all, "list"] as const,
  list: (params: TicketListParams) => [...supportKeys.lists(), params] as const,
  details: () => [...supportKeys.all, "detail"] as const,
  detail: (id: string) => [...supportKeys.details(), id] as const,
};

export function ticketListSearch(params: TicketListParams, cursor: string | null): string {
  return toSearch({
    status: params.status,
    category: params.category,
    priority: params.priority,
    assigneeId: params.assigneeId,
    q: params.q,
    cursor: cursor ?? undefined,
    limit: String(TICKETS_PAGE_SIZE),
  });
}

export function attachmentUrl(ticketId: string, messageId: string): string {
  return `/api/support/tickets/${encodeURIComponent(ticketId)}/messages/${encodeURIComponent(messageId)}/attachment`;
}

export const supportQueries = {
  list: (params: TicketListParams) =>
    infiniteQueryOptions({
      queryKey: supportKeys.list(params),
      queryFn: ({ pageParam }) =>
        fetchJson<AdminTicketListResponse>(`/api/support/tickets?${ticketListSearch(params, pageParam)}`),
      initialPageParam: null as string | null,
      getNextPageParam: (page: AdminTicketListResponse) => page.nextCursor,
      staleTime: TICKETS_STALE_MS,
      placeholderData: keepPreviousData,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: supportKeys.detail(id),
      queryFn: () => fetchJson<AdminTicketDetailResponse>(`/api/support/tickets/${encodeURIComponent(id)}`),
      staleTime: TICKET_DETAIL_STALE_MS,
      refetchInterval: 30_000,
    }),
};
