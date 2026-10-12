import type { StaffRole } from "@nextera/contracts";
import { can } from "./permissions";
import type { Permission } from "./permissions";

export type NavItem = {
  href: string;
  label: string;
  permission: Permission;
  available: boolean;
};

export const navItems: readonly NavItem[] = [
  { href: "/", label: "Dashboard", permission: "dashboard.view", available: true },
  { href: "/plans", label: "Plans", permission: "plans.view", available: true },
  { href: "/customers", label: "Customers", permission: "customers.view", available: true },
  { href: "/kyc", label: "KYC", permission: "kyc.view", available: true },
  { href: "/bank-accounts", label: "Bank review", permission: "bank.review", available: true },
  { href: "/leads", label: "Leads", permission: "leads.view", available: true },
  { href: "/withdrawals", label: "Withdrawals", permission: "withdrawals.view", available: true },
  { href: "/investments", label: "Investments", permission: "investments.view", available: true },
  { href: "/payments", label: "Payments", permission: "payments.view", available: true },
  { href: "/payment-flags", label: "Payment flags", permission: "payments.view", available: true },
  { href: "/payables", label: "Payables", permission: "payables.view", available: true },
  { href: "/support", label: "Support", permission: "support.view", available: true },
  { href: "/analytics", label: "Analytics", permission: "analytics.view", available: true },
  { href: "/staff", label: "Staff", permission: "staff.manage", available: true },
  { href: "/settings", label: "Settings", permission: "settings.manage", available: true },
  { href: "/audit", label: "Audit", permission: "audit.view", available: true },
];

export function navFor(role: StaffRole, items: readonly NavItem[] = navItems): NavItem[] {
  return items.filter((item) => item.available && can(role, item.permission));
}

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
