import { paymentStatuses } from "@nextera/contracts";
import type { PaymentStatus } from "@nextera/contracts";
import { readParam } from "@/lib/listing/params";
import type { ParamSource } from "@/lib/listing/params";
import { isOneOf } from "@/lib/shape";

export const PAYMENT_PAGE_SIZE = 50;
export const PAYMENT_MAX_LIMIT = 200;
export const FLAG_PAGE_SIZE = 50;
export const FLAG_LOOKUP_LIMIT = 200;

export type PaymentTab = PaymentStatus | "all";
export type FlagState = "open" | "resolved";

export const flagStates: readonly FlagState[] = ["open", "resolved"];

export const paymentTabs: readonly { value: PaymentTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "created", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "flagged", label: "Flagged" },
  { value: "expired", label: "Expired" },
];

export const flagTabs: readonly { value: FlagState; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
];

export function parsePaymentTab(source: ParamSource): PaymentTab {
  const status = readParam(source, "status");
  return isOneOf(paymentStatuses, status) ? status : "all";
}

export function tabStatus(tab: PaymentTab): PaymentStatus | undefined {
  return tab === "all" ? undefined : tab;
}

export function parseFlagState(source: ParamSource): FlagState {
  return readParam(source, "status") === "resolved" ? "resolved" : "open";
}

export function nextPaymentLimit(limit: number): number {
  return Math.min(limit + PAYMENT_PAGE_SIZE, PAYMENT_MAX_LIMIT);
}

export function hasMorePayments(count: number, limit: number): boolean {
  return count >= limit && limit < PAYMENT_MAX_LIMIT;
}
