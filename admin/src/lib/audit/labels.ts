import type { AuditActorType } from "@nextera/contracts";
import { isUuid } from "@/lib/shape";

export const auditActorLabels: Record<AuditActorType, string> = {
  staff: "Staff",
  customer: "Customer",
  system: "System",
};

export const knownAuditActions = [
  "bank_account.add",
  "bank_account.hold",
  "bank_account.primary",
  "customer.block",
  "customer.close",
  "customer.create",
  "customer.unblock",
  "customer.update",
  "kyc.approve",
  "kyc.reject",
  "kyc.submit",
  "ledger.manual_adjustment",
  "plan.create",
  "plan.delete",
  "plan.update",
  "settings.update",
  "staff.create",
  "staff.login",
  "staff.logout",
  "staff.password_change",
  "staff.reset_credentials",
  "staff.role_change",
] as const;

export const knownAuditEntities = ["bank_account", "customer", "kyc", "plan", "session", "settings", "staff"] as const;

export function entityHref(entity: string, entityId: string | null): string | null {
  if (!entityId || !isUuid(entityId)) return null;
  if (entity === "customer") return `/customers/${entityId}`;
  if (entity === "plan") return `/plans/${entityId}`;
  return null;
}
