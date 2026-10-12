import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { AdminInvestmentDetail, AdminInvestmentListResponse } from "@nextera/contracts";
import { INVESTMENT_PAGE_SIZE, investmentListSearch } from "@/lib/investments/filters";
import type { InvestmentListFilters } from "@/lib/investments/filters";
import { withSearch } from "@/lib/listing/params";
import { fetchJson } from "./fetchJson";

export const INVESTMENT_STALE_MS = 30_000;

export type InvestmentListPage = AdminInvestmentListResponse;
export type InvestmentDetailResponse = AdminInvestmentDetail;

export const investmentKeys = {
  all: ["investments"] as const,
  lists: () => [...investmentKeys.all, "list"] as const,
  list: (filters: InvestmentListFilters) => [...investmentKeys.lists(), filters] as const,
  details: () => [...investmentKeys.all, "detail"] as const,
  detail: (id: string) => [...investmentKeys.details(), id] as const,
};

export function nextInvestmentCursor(page: InvestmentListPage): string | undefined {
  return page.nextCursor ?? undefined;
}

export const investmentQueries = {
  list: (filters: InvestmentListFilters) =>
    infiniteQueryOptions({
      queryKey: investmentKeys.list(filters),
      queryFn: ({ pageParam }) =>
        fetchJson<InvestmentListPage>(
          withSearch("/api/investments", investmentListSearch(filters, pageParam, INVESTMENT_PAGE_SIZE)),
        ),
      initialPageParam: null as string | null,
      getNextPageParam: nextInvestmentCursor,
      staleTime: INVESTMENT_STALE_MS,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: investmentKeys.detail(id),
      queryFn: () => fetchJson<InvestmentDetailResponse>(`/api/investments/${encodeURIComponent(id)}`),
      staleTime: INVESTMENT_STALE_MS,
    }),
};
