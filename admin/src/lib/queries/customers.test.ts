import { describe, expect, it, vi } from "vitest";
import { QueryClient, hashKey } from "@tanstack/react-query";
import { parseCustomerFilters, parseLedgerFilters } from "@/lib/customers/filters";
import { parseAuditFilters } from "@/lib/audit/filters";
import { auditKeys, auditQueries } from "./audit";
import { customerKeys, customerQueries, ledgerExportUrl } from "./customers";

const customerId = "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11";

describe("customerKeys", () => {
  it("nests lists, details and ledgers under the customers root", () => {
    const filters = parseCustomerFilters({ status: "active" });
    expect(customerKeys.list(filters)).toEqual(["customers", "list", { status: "active", limit: 25, offset: 0 }]);
    expect(customerKeys.detail(customerId)).toEqual(["customers", "detail", customerId]);
    expect(customerKeys.ledger(customerId, parseLedgerFilters({}))).toEqual([
      "customers",
      "ledger",
      customerId,
      { limit: 50, offset: 0 },
    ]);
    expect(customerKeys.list(filters).slice(0, 2)).toEqual(customerKeys.lists());
    expect(customerKeys.ledger(customerId, parseLedgerFilters({})).slice(0, 3)).toEqual(customerKeys.ledgers(customerId));
  });

  it("hashes the same filters from the server and the browser to one cache entry", () => {
    const fromProps = parseCustomerFilters({ q: "asha", status: "active" });
    const fromUrl = parseCustomerFilters(new URLSearchParams("status=active&q=asha"));
    expect(hashKey(customerKeys.list(fromProps))).toBe(hashKey(customerKeys.list(fromUrl)));
  });
});

describe("customerQueries", () => {
  it("reuses the key factory", () => {
    const filters = parseCustomerFilters({});
    expect(customerQueries.list(filters).queryKey).toEqual(customerKeys.list(filters));
    expect(customerQueries.detail(customerId).queryKey).toEqual(customerKeys.detail(customerId));
    expect(customerQueries.ledger(customerId, parseLedgerFilters({})).queryKey).toEqual(
      customerKeys.ledger(customerId, parseLedgerFilters({})),
    );
  });

  it("refetches money views whenever the window regains focus", () => {
    expect(customerQueries.detail(customerId).refetchOnWindowFocus).toBe("always");
    expect(customerQueries.ledger(customerId, parseLedgerFilters({})).refetchOnWindowFocus).toBe("always");
    expect(customerQueries.list(parseCustomerFilters({})).refetchOnWindowFocus).toBeUndefined();
  });

  it("reads through the same-origin handlers with the filters in the query string", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ items: [], total: 0, limit: 25, offset: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new QueryClient();
    try {
      await client.fetchQuery(customerQueries.list(parseCustomerFilters({ q: "asha", offset: "25" })));
      await client.fetchQuery(customerQueries.detail(customerId));
      await client.fetchQuery(customerQueries.ledger(customerId, parseLedgerFilters({ account: "wallet" })));
    } finally {
      vi.unstubAllGlobals();
    }
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/customers?q=asha&limit=25&offset=25",
      `/api/customers/${customerId}`,
      `/api/customers/${customerId}/ledger?account=wallet&limit=50&offset=0`,
    ]);
  });

  it("builds the CSV export link", () => {
    expect(ledgerExportUrl(customerId)).toBe(`/api/customers/${customerId}/ledger/export`);
    expect(ledgerExportUrl(customerId, "principal:abc")).toBe(
      `/api/customers/${customerId}/ledger/export?account=principal%3Aabc`,
    );
  });
});

describe("auditQueries", () => {
  it("keys lists and entries under the audit root", () => {
    const filters = parseAuditFilters({ entity: "customer" });
    expect(auditQueries.list(filters).queryKey).toEqual(["audit", "list", { entity: "customer", limit: 25, offset: 0 }]);
    expect(auditQueries.detail("e1").queryKey).toEqual(auditKeys.detail("e1"));
    expect(auditKeys.detail("e1").slice(0, 1)).toEqual(auditKeys.all);
  });
});
