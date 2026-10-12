import { describe, expect, it } from "vitest";
import { can, permissions } from "./permissions";
import type { Permission } from "./permissions";

describe("can", () => {
  it("lets every role read plans but only owner and ops change them", () => {
    expect(can("owner", "plans.view")).toBe(true);
    expect(can("ops", "plans.view")).toBe(true);
    expect(can("support", "plans.view")).toBe(true);
    expect(can("owner", "plans.write")).toBe(true);
    expect(can("ops", "plans.write")).toBe(true);
    expect(can("support", "plans.write")).toBe(false);
  });

  it("mirrors the spec role table", () => {
    const expected: Record<Permission, string> = {
      "dashboard.view": "owner ops support",
      "plans.view": "owner ops support",
      "plans.write": "owner ops",
      "customers.view": "owner ops support",
      "customers.write": "owner ops",
      "kyc.view": "owner ops",
      "kyc.review": "owner ops",
      "bank.review": "owner ops",
      "ledger.adjust": "owner",
      "investments.view": "owner ops support",
      "payments.view": "owner ops support",
      "payments.resolve": "owner ops",
      "leads.view": "owner ops support",
      "leads.write": "owner ops support",
      "withdrawals.view": "owner ops",
      "withdrawals.write": "owner ops",
      "withdrawals.override": "owner",
      "payables.view": "owner ops",
      "support.view": "owner ops support",
      "support.write": "owner ops support",
      "analytics.view": "owner ops",
      "staff.manage": "owner",
      "settings.manage": "owner",
      "audit.view": "owner",
    };
    for (const permission of Object.keys(permissions) as Permission[]) {
      const allowed = (["owner", "ops", "support"] as const).filter((role) => can(role, permission));
      expect(allowed.join(" "), permission).toBe(expected[permission]);
    }
  });
});
