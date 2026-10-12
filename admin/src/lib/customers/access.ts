import type { StaffRole } from "@nextera/contracts";
import { can } from "@/lib/permissions";

export type CustomerAccess = {
  canWrite: boolean;
  canChangePhone: boolean;
  canAdjust: boolean;
  canReviewKyc: boolean;
  canViewKyc: boolean;
  canViewAudit: boolean;
  canRevokeSessions: boolean;
};

export function customerAccess(role: StaffRole): CustomerAccess {
  return {
    canWrite: can(role, "customers.write"),
    canChangePhone: role === "owner",
    canAdjust: can(role, "ledger.adjust"),
    canReviewKyc: can(role, "kyc.review"),
    canViewKyc: can(role, "customers.view"),
    canViewAudit: can(role, "audit.view"),
    canRevokeSessions: can(role, "customers.write"),
  };
}
