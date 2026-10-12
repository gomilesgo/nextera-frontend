import type { TicketCategory, TicketStatus } from "@nextera/contracts";
import type { BadgeTone } from "@/components/ui/Badge";

export const categoryCopy: Record<TicketCategory, { label: string; hint: string }> = {
  payment: { label: "Payments", hint: "Paying into a plan, failed or pending payments" },
  withdrawal: { label: "Withdrawals", hint: "Withdrawing returns or receiving your principal" },
  kyc: { label: "KYC and bank account", hint: "Verification, PAN, address or bank details" },
  investment: { label: "Investments", hint: "Your plans, agreements, certificates or monthly returns" },
  other: { label: "Something else", hint: "Anything not covered above" },
};

export const statusCopy: Record<TicketStatus, { label: string; tone: BadgeTone; body: string }> = {
  open: { label: "Open", tone: "info", body: "Our team will reply here, usually within one working day." },
  pending_customer: {
    label: "Awaiting your reply",
    tone: "warning",
    body: "We have replied and need a little more from you.",
  },
  resolved: {
    label: "Resolved",
    tone: "success",
    body: "We have marked this as resolved. Reply if you still need help and it will reopen.",
  },
  closed: { label: "Closed", tone: "neutral", body: "This request is closed and cannot take new replies." },
};

export const statusFilters: ReadonlyArray<{ value: TicketStatus | null; label: string }> = [
  { value: null, label: "All" },
  { value: "open", label: "Open" },
  { value: "pending_customer", label: "Awaiting you" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes >= 10 ? Math.round(megabytes) : Math.round(megabytes * 10) / 10} MB`;
}

const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateOnly = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatTicketTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateTime.format(date);
}

export function formatTicketDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateOnly.format(date);
}
