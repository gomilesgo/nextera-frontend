import { describe, expect, it } from "vitest";
import { customerAccess } from "./access";

describe("customerAccess", () => {
  it("gives owners every control", () => {
    expect(customerAccess("owner")).toEqual({
      canWrite: true,
      canChangePhone: true,
      canAdjust: true,
      canReviewKyc: true,
      canViewKyc: true,
      canViewAudit: true,
      canRevokeSessions: true,
    });
  });

  it("lets ops manage customers without phone changes, adjustments or the audit log", () => {
    expect(customerAccess("ops")).toEqual({
      canWrite: true,
      canChangePhone: false,
      canAdjust: false,
      canReviewKyc: true,
      canViewKyc: true,
      canViewAudit: false,
      canRevokeSessions: true,
    });
  });

  it("keeps support read-only except KYC viewing", () => {
    const access = customerAccess("support");
    expect(access.canWrite).toBe(false);
    expect(access.canChangePhone).toBe(false);
    expect(access.canAdjust).toBe(false);
    expect(access.canReviewKyc).toBe(false);
    expect(access.canViewKyc).toBe(true);
    expect(access.canViewAudit).toBe(false);
    expect(access.canRevokeSessions).toBe(false);
  });
});
