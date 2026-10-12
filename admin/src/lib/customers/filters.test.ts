import { describe, expect, it } from "vitest";
import { adminCustomerListQuerySchema, customerLedgerQuerySchema } from "@nextera/contracts";
import {
  customerFiltersBackendSearch,
  customerFiltersSearch,
  hasCustomerFilters,
  ledgerFiltersBackendSearch,
  ledgerFiltersSearch,
  parseCustomerFilters,
  parseLedgerFilters,
} from "./filters";

describe("parseCustomerFilters", () => {
  it("reads every filter from the URL", () => {
    const filters = parseCustomerFilters(
      new URLSearchParams("status=blocked&kycStatus=verified&q=%20asha%20&createdFrom=2026-10-01&createdTo=2026-10-11&offset=25"),
    );
    expect(filters).toEqual({
      status: "blocked",
      kycStatus: "verified",
      q: "asha",
      createdFrom: "2026-10-01",
      createdTo: "2026-10-11",
      limit: 25,
      offset: 25,
    });
    expect(hasCustomerFilters(filters)).toBe(true);
  });

  it("drops unknown or malformed values instead of failing the page", () => {
    expect(
      parseCustomerFilters({
        status: "deleted",
        kycStatus: "VERIFIED",
        q: "   ",
        createdFrom: "2026-02-30",
        createdTo: "yesterday",
        offset: "-1",
      }),
    ).toEqual({ limit: 25, offset: 0 });
    expect(parseCustomerFilters({ q: "x".repeat(101) })).toEqual({ limit: 25, offset: 0 });
    expect(hasCustomerFilters(parseCustomerFilters({}))).toBe(false);
  });

  it("drops an end date that is before the start date", () => {
    expect(parseCustomerFilters({ createdFrom: "2026-10-10", createdTo: "2026-10-01" })).toEqual({
      createdFrom: "2026-10-10",
      limit: 25,
      offset: 0,
    });
  });

  it("produces the same filters from page props and the browser URL", () => {
    const search = "q=asha&status=active&offset=50";
    expect(parseCustomerFilters(Object.fromEntries(new URLSearchParams(search)))).toEqual(
      parseCustomerFilters(new URLSearchParams(search)),
    );
  });

  it("round-trips through the URL without default noise", () => {
    const filters = parseCustomerFilters({ q: "asha", kycStatus: "submitted", offset: "0" });
    expect(customerFiltersSearch(filters)).toBe("kycStatus=submitted&q=asha");
    expect(parseCustomerFilters(new URLSearchParams(customerFiltersSearch(filters)))).toEqual(filters);
  });

  it("always sends an explicit window that the backend schema accepts", () => {
    const filters = parseCustomerFilters({ status: "active", createdFrom: "2026-10-01" });
    const search = customerFiltersBackendSearch(filters);
    expect(search).toBe("status=active&createdFrom=2026-10-01&limit=25&offset=0");
    expect(adminCustomerListQuerySchema.safeParse(Object.fromEntries(new URLSearchParams(search))).success).toBe(true);
  });
});

describe("parseLedgerFilters", () => {
  it("defaults to 50 entries and an optional account", () => {
    expect(parseLedgerFilters({})).toEqual({ limit: 50, offset: 0 });
    expect(parseLedgerFilters({ account: "wallet", offset: "100" })).toEqual({ account: "wallet", limit: 50, offset: 100 });
    expect(parseLedgerFilters({ account: "  " })).toEqual({ limit: 50, offset: 0 });
  });

  it("serialises for the URL and the backend", () => {
    const filters = parseLedgerFilters({ account: "wallet", offset: "50" });
    expect(ledgerFiltersSearch(filters)).toBe("account=wallet&offset=50");
    const backend = ledgerFiltersBackendSearch(filters);
    expect(customerLedgerQuerySchema.parse(Object.fromEntries(new URLSearchParams(backend)))).toEqual({
      account: "wallet",
      limit: 50,
      offset: 50,
    });
  });
});
