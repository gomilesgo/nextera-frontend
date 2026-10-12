import "server-only";
import type { AuditLogDetailResponse, AuditLogPage } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { callBackend } from "@/lib/backend/server";
import { checkShape, unwrapForPage } from "@/lib/backend/read";
import { isUuid } from "@/lib/shape";
import { withSearch } from "@/lib/listing/params";
import { auditFiltersBackendSearch } from "./filters";
import type { AuditFilters } from "./filters";
import { isAuditDetailResponse, isAuditPage } from "./shape";

export async function fetchAuditLog(token: string, filters: AuditFilters): Promise<BackendResult<AuditLogPage>> {
  const result = await callBackend<unknown>(withSearch("/v1/admin/audit", auditFiltersBackendSearch(filters)), { token });
  return checkShape(result, isAuditPage, "audit log");
}

export async function fetchAuditEntry(token: string, entryId: string): Promise<BackendResult<AuditLogDetailResponse>> {
  if (!isUuid(entryId)) {
    return { ok: false, status: 404, error: { code: "not_found", message: "Audit entry not found" } };
  }
  const result = await callBackend<unknown>(`/v1/admin/audit/${encodeURIComponent(entryId)}`, { token });
  return checkShape(result, isAuditDetailResponse, "audit entry");
}

export async function loadAuditLog(token: string, filters: AuditFilters): Promise<AuditLogPage> {
  return unwrapForPage(await fetchAuditLog(token, filters)) ?? { items: [], total: 0, limit: filters.limit, offset: filters.offset };
}

export async function loadAuditEntry(token: string, entryId: string): Promise<AuditLogDetailResponse | null> {
  return unwrapForPage(await fetchAuditEntry(token, entryId));
}
