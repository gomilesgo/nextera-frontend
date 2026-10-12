import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { AdminLeadListResponse, AdminLeadResponse } from "@nextera/contracts";
import { toSearch } from "@/lib/filters";
import type { LeadListParams } from "@/lib/leads/filters";
import { fetchJson } from "./fetchJson";

export const LEADS_PAGE_SIZE = 50;
export const LEADS_STALE_MS = 15_000;

export const leadKeys = {
  all: ["leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (params: LeadListParams) => [...leadKeys.lists(), params] as const,
  details: () => [...leadKeys.all, "detail"] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
};

export function leadListSearch(params: LeadListParams, cursor: string | null): string {
  return toSearch({
    status: params.status,
    q: params.q,
    from: params.from,
    to: params.to,
    assigneeId: params.assigneeId,
    cursor: cursor ?? undefined,
    limit: String(LEADS_PAGE_SIZE),
  });
}

export const leadQueries = {
  list: (params: LeadListParams) =>
    infiniteQueryOptions({
      queryKey: leadKeys.list(params),
      queryFn: ({ pageParam }) => fetchJson<AdminLeadListResponse>(`/api/leads?${leadListSearch(params, pageParam)}`),
      initialPageParam: null as string | null,
      getNextPageParam: (page: AdminLeadListResponse) => page.nextCursor,
      staleTime: LEADS_STALE_MS,
      placeholderData: keepPreviousData,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: leadKeys.detail(id),
      queryFn: () => fetchJson<AdminLeadResponse>(`/api/leads/${encodeURIComponent(id)}`),
      staleTime: LEADS_STALE_MS,
    }),
};
