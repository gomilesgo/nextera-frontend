import { describe, expect, it } from "vitest";
import { isActive, navFor, navItems } from "./nav";
import type { NavItem } from "./nav";

describe("navFor", () => {
  it("only shows sections that exist in this build", () => {
    expect(navFor("owner").map((item) => item.label)).toEqual([
      "Dashboard",
      "Plans",
      "Customers",
      "KYC",
      "Bank review",
      "Leads",
      "Withdrawals",
      "Investments",
      "Payments",
      "Payment flags",
      "Payables",
      "Support",
      "Analytics",
      "Staff",
      "Settings",
      "Audit",
    ]);
    expect(navFor("ops").map((item) => item.label)).toEqual([
      "Dashboard",
      "Plans",
      "Customers",
      "KYC",
      "Bank review",
      "Leads",
      "Withdrawals",
      "Investments",
      "Payments",
      "Payment flags",
      "Payables",
      "Support",
      "Analytics",
    ]);
    expect(navFor("support").map((item) => item.label)).toEqual([
      "Dashboard",
      "Plans",
      "Customers",
      "Leads",
      "Investments",
      "Payments",
      "Payment flags",
      "Support",
    ]);
  });

  it("keeps the full section list in spec order", () => {
    expect(navItems.map((item) => item.label)).toEqual([
      "Dashboard",
      "Plans",
      "Customers",
      "KYC",
      "Bank review",
      "Leads",
      "Withdrawals",
      "Investments",
      "Payments",
      "Payment flags",
      "Payables",
      "Support",
      "Analytics",
      "Staff",
      "Settings",
      "Audit",
    ]);
  });

  it("hides sections the role cannot use", () => {
    const items: NavItem[] = navItems.map((item) => ({ ...item, available: true }));
    expect(navFor("support", items).map((item) => item.label)).toEqual([
      "Dashboard",
      "Plans",
      "Customers",
      "Leads",
      "Investments",
      "Payments",
      "Payment flags",
      "Support",
    ]);
    expect(navFor("ops", items).map((item) => item.label)).not.toContain("Staff");
    expect(navFor("owner", items)).toHaveLength(16);
    expect(navFor("ops", items).map((item) => item.label)).toContain("Withdrawals");
    expect(navFor("support", items).map((item) => item.label)).not.toContain("Withdrawals");
  });
});

describe("isActive", () => {
  it("matches the dashboard exactly and sections by prefix", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/plans", "/")).toBe(false);
    expect(isActive("/plans/new", "/plans")).toBe(true);
    expect(isActive("/plansx", "/plans")).toBe(false);
    expect(isActive("/payment-flags", "/payments")).toBe(false);
    expect(isActive("/payments", "/payment-flags")).toBe(false);
  });
});
