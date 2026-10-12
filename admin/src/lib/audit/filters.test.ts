import { describe, expect, it } from "vitest";
import { auditLogQuerySchema } from "@nextera/contracts";
import {
  auditFiltersBackendSearch,
  auditFiltersSearch,
  hasAuditFilters,
  parseAuditEntryId,
  parseAuditFilters,
} from "./filters";

const staffId = "5b1f0c62-8d3e-4c1a-9f7e-2a4b6c8d0e12";
const entryId = "0d4c7a2e-1b3f-4e5a-8c6d-9f0a1b2c3d4e";

describe("parseAuditFilters", () => {
  it("reads actor, action, entity and date filters", () => {
    const filters = parseAuditFilters(
      new URLSearchParams(
        `actorType=staff&actorId=${staffId.toUpperCase()}&action=customer.block&entity=customer&entityId=c-1&from=2026-10-01&to=2026-10-12&offset=25`,
      ),
    );
    expect(filters).toEqual({
      actorType: "staff",
      actorId: staffId,
      action: "customer.block",
      entity: "customer",
      entityId: "c-1",
      from: "2026-10-01",
      to: "2026-10-12",
      limit: 25,
      offset: 25,
    });
    expect(hasAuditFilters(filters)).toBe(true);
  });

  it("drops invalid actor ids, actor types and reversed ranges", () => {
    expect(parseAuditFilters({ actorType: "robot", actorId: "not-a-uuid", from: "2026-10-12", to: "2026-10-01" })).toEqual({
      from: "2026-10-12",
      limit: 25,
      offset: 0,
    });
    expect(hasAuditFilters(parseAuditFilters({}))).toBe(false);
  });

  it("keeps the open entry in the URL alongside the filters", () => {
    const filters = parseAuditFilters({ entity: "customer" });
    const search = auditFiltersSearch(filters, entryId);
    expect(search).toBe(`entity=customer&entry=${entryId}`);
    expect(parseAuditEntryId(new URLSearchParams(search))).toBe(entryId);
    expect(parseAuditEntryId({ entry: "../../etc" })).toBeUndefined();
    expect(auditFiltersSearch(filters)).toBe("entity=customer");
  });

  it("sends the backend only the filters its schema accepts", () => {
    const filters = parseAuditFilters({ action: "ledger.manual_adjustment", entry: entryId });
    const search = auditFiltersBackendSearch(filters);
    expect(search).toBe("action=ledger.manual_adjustment&offset=0&limit=25");
    expect(auditLogQuerySchema.safeParse(Object.fromEntries(new URLSearchParams(search))).success).toBe(true);
  });
});
