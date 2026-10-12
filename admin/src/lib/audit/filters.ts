import { z } from "zod";
import { auditActorTypes, dateRangeIsOrdered, isoDateSchema } from "@nextera/contracts";
import type { AuditActorType } from "@nextera/contracts";
import { LIST_PAGE_SIZE, lenient, readPageWindow, readParam, toSearchString } from "@/lib/listing/params";
import type { PageWindow, ParamSource } from "@/lib/listing/params";

export type AuditFilterValues = {
  actorType?: AuditActorType;
  actorId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  from?: string;
  to?: string;
};

export type AuditFilters = AuditFilterValues & PageWindow;

const text = (max: number) => z.string().trim().min(1).max(max);

export const auditEntryParam = "entry";

const uuidSchema = z.string().trim().uuid();

export function parseAuditFilters(source: ParamSource): AuditFilters {
  const from = lenient(isoDateSchema, readParam(source, "from"));
  let to = lenient(isoDateSchema, readParam(source, "to"));
  if (!dateRangeIsOrdered(from, to)) to = undefined;
  const filters: AuditFilters = {
    actorType: lenient(z.enum(auditActorTypes), readParam(source, "actorType")),
    actorId: lenient(uuidSchema, readParam(source, "actorId"))?.toLowerCase(),
    action: lenient(text(100), readParam(source, "action")),
    entity: lenient(text(100), readParam(source, "entity")),
    entityId: lenient(text(200), readParam(source, "entityId")),
    from,
    to,
    ...readPageWindow(source, LIST_PAGE_SIZE),
  };
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined)) as AuditFilters;
}

export function parseAuditEntryId(source: ParamSource): string | undefined {
  return lenient(uuidSchema, readParam(source, auditEntryParam))?.toLowerCase();
}

function searchValues(filters: AuditFilters) {
  return {
    actorType: filters.actorType,
    actorId: filters.actorId,
    action: filters.action,
    entity: filters.entity,
    entityId: filters.entityId,
    from: filters.from,
    to: filters.to,
    offset: filters.offset,
    limit: filters.limit,
  };
}

export function auditFiltersSearch(filters: AuditFilters, entryId?: string): string {
  return toSearchString(
    { ...searchValues(filters), [auditEntryParam]: entryId },
    { offset: 0, limit: LIST_PAGE_SIZE },
  );
}

export function auditFiltersBackendSearch(filters: AuditFilters): string {
  return toSearchString(searchValues(filters));
}

export function hasAuditFilters(filters: AuditFilters): boolean {
  return Boolean(
    filters.actorType || filters.actorId || filters.action || filters.entity || filters.entityId || filters.from || filters.to,
  );
}
