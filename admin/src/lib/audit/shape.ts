import { auditActorTypes } from "@nextera/contracts";
import type { AuditLogDetail, AuditLogDetailResponse, AuditLogEntry, AuditLogPage } from "@nextera/contracts";
import { isPage } from "@/lib/customers/shape";

function nullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

export function isAuditEntry(value: unknown): value is AuditLogEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.actorType === "string" &&
    (auditActorTypes as readonly string[]).includes(entry.actorType) &&
    nullableString(entry.actorId) &&
    nullableString(entry.actorName) &&
    typeof entry.action === "string" &&
    typeof entry.entity === "string" &&
    nullableString(entry.entityId) &&
    nullableString(entry.ip) &&
    typeof entry.at === "string"
  );
}

export function isAuditPage(value: unknown): value is AuditLogPage {
  return isPage(value, isAuditEntry);
}

function isAuditDetail(value: unknown): value is AuditLogDetail {
  return isAuditEntry(value) && "before" in value && "after" in value;
}

export function isAuditDetailResponse(value: unknown): value is AuditLogDetailResponse {
  return Boolean(value) && typeof value === "object" && isAuditDetail((value as { entry?: unknown }).entry);
}
