import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { PayablesCustomerListResponse, PayablesSummaryResponse } from "@nextera/contracts";
import { toSearchString, withSearch } from "@/lib/listing/params";
import { fetchJson } from "./fetchJson";

export const PAYABLES_STALE_MS = 60_000;
export const PAYABLES_PAGE_SIZE = 50;

export type SortOption = "totalPayable_desc" | "totalPayable_asc";

export const payablesKeys = {
  all: ["payables"] as const,
  summary: () => [...payablesKeys.all, "summary"] as const,
  customerLists: () => [...payablesKeys.all, "customers"] as const,
  customerList: (sort: SortOption) => [...payablesKeys.customerLists(), sort] as const,
};

export function nextPayablesCursor(page: PayablesCustomerListResponse): string | undefined {
  return page.nextCursor ?? undefined;
}

export const payablesQueries = {
  summary: () =>
    queryOptions({
      queryKey: payablesKeys.summary(),
      queryFn: () => fetchJson<PayablesSummaryResponse>("/api/payables/summary"),
      staleTime: PAYABLES_STALE_MS,
      refetchOnWindowFocus: "always",
    }),
  customers: (sort: SortOption) =>
    infiniteQueryOptions({
      queryKey: payablesKeys.customerList(sort),
      queryFn: ({ pageParam }) =>
        fetchJson<PayablesCustomerListResponse>(
          withSearch(
            "/api/payables/customers",
            toSearchString({ cursor: pageParam ?? undefined, limit: PAYABLES_PAGE_SIZE, sort }),
          ),
        ),
      initialPageParam: null as string | null,
      getNextPageParam: nextPayablesCursor,
      staleTime: PAYABLES_STALE_MS,
      refetchOnWindowFocus: "always",
    }),
};
