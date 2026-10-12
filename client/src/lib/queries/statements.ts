import { infiniteQueryOptions } from "@tanstack/react-query";
import type { PortalStatementPage } from "@/lib/statements";
import { fetchApi } from "./fetchApi";
import { queryKeys } from "./keys";

export type StatementPage = PortalStatementPage;

type PageLoader = (cursor: string | null, signal?: AbortSignal) => Promise<StatementPage>;

export const STATEMENTS_STALE_MS = 30_000;

export function statementsUrl(cursor: string | null): string {
  return cursor ? `/api/statements?cursor=${encodeURIComponent(cursor)}` : "/api/statements";
}

export function statementsQuery(load: PageLoader = (cursor, signal) => fetchApi<StatementPage>(statementsUrl(cursor), signal)) {
  return infiniteQueryOptions({
    queryKey: queryKeys.statements.list(),
    queryFn: ({ pageParam, signal }) => load(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: STATEMENTS_STALE_MS,
    refetchOnWindowFocus: false,
  });
}
