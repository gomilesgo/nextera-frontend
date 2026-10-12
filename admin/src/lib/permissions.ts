import type { StaffRole } from "@nextera/contracts";

const everyone: readonly StaffRole[] = ["owner", "ops", "support"];
const managers: readonly StaffRole[] = ["owner", "ops"];
const ownerOnly: readonly StaffRole[] = ["owner"];

export const permissions = {
  "dashboard.view": everyone,
  "plans.view": everyone,
  "plans.write": managers,
  "customers.view": everyone,
  "customers.write": managers,
  "kyc.view": managers,
  "kyc.review": managers,
  "bank.review": managers,
  "ledger.adjust": ownerOnly,
  "investments.view": everyone,
  "payments.view": everyone,
  "payments.resolve": managers,
  "leads.view": everyone,
  "leads.write": everyone,
  "withdrawals.view": managers,
  "withdrawals.write": managers,
  "withdrawals.override": ownerOnly,
  "payables.view": managers,
  "support.view": everyone,
  "support.write": everyone,
  "analytics.view": managers,
  "staff.manage": ownerOnly,
  "settings.manage": ownerOnly,
  "audit.view": ownerOnly,
} as const satisfies Record<string, readonly StaffRole[]>;

export type Permission = keyof typeof permissions;

export function can(role: StaffRole, permission: Permission): boolean {
  return (permissions[permission] as readonly StaffRole[]).includes(role);
}
