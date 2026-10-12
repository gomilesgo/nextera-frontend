import { describe, expect, it } from "vitest";
import {
  hasFilters,
  investmentListSearch,
  investmentsHref,
  listFilters,
  parseInvestmentFilters,
} from "./filters";
import {
  hasMorePayments,
  nextPaymentLimit,
  parseFlagState,
  parsePaymentTab,
  tabStatus,
} from "@/lib/payments/filters";
import { customerId } from "@/test/fixtures";
import { planId } from "@/test/investments";

describe("parseInvestmentFilters", () => {
  it("reads status, plan and a customer id from the URL", () => {
    expect(parseInvestmentFilters({ status: "active", plan: planId, customer: customerId.toUpperCase() })).toEqual({
      status: "active",
      planId,
      customerId,
    });
  });

  it("drops unknown statuses and malformed plan ids", () => {
    expect(parseInvestmentFilters({ status: "bogus", plan: "../plans" })).toEqual({});
    expect(parseInvestmentFilters({ status: ["matured", "active"] })).toEqual({ status: "matured" });
  });

  it("treats any other customer text as a search", () => {
    expect(parseInvestmentFilters({ customer: "  Asha   Rao " })).toEqual({ customerSearch: "Asha Rao" });
    expect(parseInvestmentFilters({ customer: "   " })).toEqual({});
    expect(parseInvestmentFilters({ customer: "x".repeat(300) }).customerSearch).toHaveLength(100);
  });

  it("keeps only backend filters for the list query", () => {
    const filters = parseInvestmentFilters({ status: "active", customer: "Asha" });
    expect(listFilters(filters)).toEqual({ status: "active" });
    expect(hasFilters(filters)).toBe(true);
    expect(hasFilters({})).toBe(false);
  });

  it("round-trips through the page URL", () => {
    const filters = { status: "cancelled" as const, planId, customerId };
    expect(investmentsHref(filters)).toBe(`/investments?status=cancelled&plan=${planId}&customer=${customerId}`);
    expect(parseInvestmentFilters(Object.fromEntries(new URL(investmentsHref(filters), "http://n").searchParams))).toEqual(filters);
    expect(investmentsHref({ customerSearch: "Asha Rao" })).toBe("/investments?customer=Asha+Rao");
    expect(investmentsHref({})).toBe("/investments");
  });

  it("builds the route handler query with the cursor", () => {
    expect(investmentListSearch({ planId }, "c1", 50)).toBe(`planId=${planId}&cursor=c1&limit=50`);
    expect(investmentListSearch({}, null, 50)).toBe("limit=50");
  });
});

describe("payment filters", () => {
  it("reads the payment status tab, defaulting to all", () => {
    expect(parsePaymentTab({ status: "flagged" })).toBe("flagged");
    expect(parsePaymentTab({ status: ["paid"] })).toBe("paid");
    expect(parsePaymentTab(new URLSearchParams("status=bogus"))).toBe("all");
    expect(parsePaymentTab({})).toBe("all");
    expect(tabStatus("all")).toBeUndefined();
    expect(tabStatus("expired")).toBe("expired");
  });

  it("reads the flag state tab, defaulting to open", () => {
    expect(parseFlagState(new URLSearchParams("status=resolved"))).toBe("resolved");
    expect(parseFlagState({ status: "open" })).toBe("open");
    expect(parseFlagState({ status: "all" })).toBe("open");
    expect(parseFlagState({})).toBe("open");
  });

  it("grows the payment list up to the backend limit", () => {
    expect(nextPaymentLimit(50)).toBe(100);
    expect(nextPaymentLimit(180)).toBe(200);
    expect(hasMorePayments(50, 50)).toBe(true);
    expect(hasMorePayments(12, 50)).toBe(false);
    expect(hasMorePayments(200, 200)).toBe(false);
  });
});
