import { describe, expect, it } from "vitest";
import { leadFiltersPath, leadListParams, parseLeadFilters } from "@/lib/leads/filters";
import { parseTicketFilters, ticketFiltersPath, ticketListParams } from "@/lib/support/filters";
import { assigneeId } from "@/test/desk";
import { pickAssignee, pickDate, toSearch } from "./filters";

const me = "0e5f8a3c-9f1d-4c55-8a0e-1b2c3d4e5f60";

describe("URL filter helpers", () => {
  it("accept only real ISO dates", () => {
    expect(pickDate("2026-10-12")).toBe("2026-10-12");
    expect(pickDate(["2026-02-28", "2026-03-01"])).toBe("2026-02-28");
    expect(pickDate("2026-02-30")).toBeUndefined();
    expect(pickDate("12/10/2026")).toBeUndefined();
    expect(pickDate("2026-10-12T00:00")).toBeUndefined();
  });

  it("accept none, me or a staff uuid as the assignee", () => {
    expect(pickAssignee("none")).toBe("none");
    expect(pickAssignee("ME")).toBe("me");
    expect(pickAssignee(assigneeId.toUpperCase())).toBe(assigneeId);
    expect(pickAssignee("bob")).toBeUndefined();
    expect(pickAssignee("")).toBeUndefined();
  });

  it("drop empty values from search strings", () => {
    expect(toSearch({ a: "1", b: undefined, c: "", d: "x y" })).toBe("a=1&d=x+y");
  });
});

describe("lead filters", () => {
  it("parse a full URL and round-trip to a canonical path", () => {
    const filters = parseLeadFilters({
      status: "qualified",
      q: "  Ravi  ",
      from: "2026-10-01",
      to: "2026-10-11",
      assignee: "me",
      cursor: "ignored",
    });
    expect(filters).toEqual({ status: "qualified", q: "Ravi", from: "2026-10-01", to: "2026-10-11", assignee: "me" });
    expect(leadFiltersPath(filters)).toBe("/leads?status=qualified&q=Ravi&from=2026-10-01&to=2026-10-11&assignee=me");
    expect(parseLeadFilters(Object.fromEntries(new URL(`http://x${leadFiltersPath(filters)}`).searchParams))).toEqual(filters);
  });

  it("ignore unknown statuses, bad dates and reversed ranges", () => {
    expect(parseLeadFilters({ status: "won", from: "2026-13-01", assignee: "someone" })).toEqual({});
    expect(parseLeadFilters({ from: "2026-10-12", to: "2026-10-01" })).toEqual({});
    expect(parseLeadFilters({ q: "x".repeat(300) }).q).toHaveLength(100);
    expect(leadFiltersPath({})).toBe("/leads");
  });

  it("resolve me to the signed-in staff id for the API", () => {
    expect(leadListParams({ assignee: "me", status: "new" }, me)).toEqual({ status: "new", assigneeId: me });
    expect(leadListParams({ assignee: "none" }, me)).toEqual({ assigneeId: "none" });
    expect(leadListParams({}, me)).toEqual({});
  });
});

describe("ticket filters", () => {
  it("default to open tickets and keep that out of the URL", () => {
    expect(parseTicketFilters({})).toEqual({ status: "open" });
    expect(ticketFiltersPath({ status: "open" })).toBe("/support");
    expect(ticketListParams({ status: "open" }, me)).toEqual({ status: "open" });
  });

  it("treat all as no status filter", () => {
    const filters = parseTicketFilters({ status: "all", category: "kyc", priority: "urgent", assignee: "none", q: "NXT" });
    expect(filters).toEqual({ status: "all", category: "kyc", priority: "urgent", assignee: "none", q: "NXT" });
    expect(ticketListParams(filters, me)).toEqual({ category: "kyc", priority: "urgent", assigneeId: "none", q: "NXT" });
    expect(ticketFiltersPath(filters)).toBe("/support?status=all&category=kyc&priority=urgent&assignee=none&q=NXT");
  });

  it("ignore unknown values and resolve me", () => {
    expect(parseTicketFilters({ status: "waiting", category: "loans", priority: "p0", assignee: "me" })).toEqual({
      status: "open",
      assignee: "me",
    });
    expect(ticketListParams({ status: "resolved", assignee: "me" }, me)).toEqual({ status: "resolved", assigneeId: me });
  });
});
