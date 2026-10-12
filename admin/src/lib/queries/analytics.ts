import { queryOptions } from "@tanstack/react-query";
import type { AnalyticsOverviewQuery, AnalyticsOverviewResponse } from "@nextera/contracts";
import { toSearchString, withSearch } from "@/lib/listing/params";
import { fetchJson } from "./fetchJson";

export const ANALYTICS_STALE_MS = 60_000;

export const analyticsKeys = {
  all: ["analytics"] as const,
  overviews: () => [...analyticsKeys.all, "overview"] as const,
  overview: (query: AnalyticsOverviewQuery) => [...analyticsKeys.overviews(), query] as const,
};

export const analyticsQueries = {
  overview: (query: AnalyticsOverviewQuery) =>
    queryOptions({
      queryKey: analyticsKeys.overview(query),
      queryFn: () =>
        fetchJson<AnalyticsOverviewResponse>(
          withSearch("/api/analytics/overview", toSearchString({ from: query.from, to: query.to })),
        ),
      staleTime: ANALYTICS_STALE_MS,
    }),
};
