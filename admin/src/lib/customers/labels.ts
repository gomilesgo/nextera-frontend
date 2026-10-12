import type { BankAccountStatus, CustomerOrigin, CustomerStatus, KycStatus } from "@nextera/contracts";
import { humanize } from "@/lib/format";
import type { Tone } from "@/lib/format";

export type { Tone };

export const customerStatusLabels: Record<CustomerStatus, string> = {
  active: "Active",
  blocked: "Blocked",
  closed: "Closed",
};

export const customerStatusTones: Record<CustomerStatus, Tone> = {
  active: "success",
  blocked: "warning",
  closed: "neutral",
};

export const kycStatusLabels: Record<KycStatus, string> = {
  none: "Not started",
  submitted: "Submitted",
  verified: "Verified",
  rejected: "Rejected",
};

export const kycStatusTones: Record<KycStatus, Tone> = {
  none: "neutral",
  submitted: "info",
  verified: "success",
  rejected: "danger",
};

export const bankStatusLabels: Record<BankAccountStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  failed: "Failed",
  review: "In review",
  rejected: "Rejected",
};

export const bankStatusTones: Record<BankAccountStatus, Tone> = {
  pending: "neutral",
  verified: "success",
  failed: "danger",
  review: "info",
  rejected: "danger",
};

export const originLabels: Record<CustomerOrigin, string> = {
  self: "Self sign-up",
  admin: "Staff",
  lead: "Lead",
};

export function accountLabel(account: string): string {
  if (account === "wallet") return "Wallet";
  if (account === "withdrawal_hold") return "Withdrawal hold";
  if (account.startsWith("principal:")) return `Principal ${account.slice("principal:".length, "principal:".length + 8)}`;
  return humanize(account);
}

const causeLabels: Record<string, string> = {
  manual_adjustment: "Manual adjustment",
};

export function causeLabel(refType: string): string {
  return causeLabels[refType] ?? humanize(refType);
}
