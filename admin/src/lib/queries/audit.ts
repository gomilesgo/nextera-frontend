import { queryOptions } from "@tanstack/react-query";
import type { AuditLogDetailResponse, AuditLogPage } from "@nextera/contracts";
import { auditFiltersBackendSearch } from "@/lib/audit/filters";
import type { AuditFilters } from "@/lib/audit/filters";
import { withSearch } from "@/lib/listing/params";
import { fetchJson } from "./fetchJson";

export const AUDIT_STALE_MS = 30_000;
export const AUDIT_ENTRY_STALE_MS = 5 * 60_000;

export const auditKeys = {
  all: ["audit"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  list: (filters: AuditFilters) => [...auditKeys.lists(), filters] as const,
  detail: (entryId: string) => [...auditKeys.all, "detail", entryId] as const,
};

export const auditQueries = {
  list: (filters: AuditFilters) =>
    queryOptions({
      queryKey: auditKeys.list(filters),
      queryFn: () => fetchJson<AuditLogPage>(withSearch("/api/audit", auditFiltersBackendSearch(filters))),
      staleTime: AUDIT_STALE_MS,
    }),
  detail: (entryId: string) =>
    queryOptions({
      queryKey: auditKeys.detail(entryId),
      queryFn: () => fetchJson<AuditLogDetailResponse>(`/api/audit/${encodeURIComponent(entryId)}`),
      staleTime: AUDIT_ENTRY_STALE_MS,
    }),
};
