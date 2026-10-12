import type { AdminTicketSummary, TicketCategory, TicketPriority, TicketStatus } from "@nextera/contracts";
import type { Tone } from "@/lib/format";

export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: "Open",
  pending_customer: "Waiting on customer",
  resolved: "Resolved",
  closed: "Closed",
};

export const ticketStatusTones: Record<TicketStatus, Tone> = {
  open: "info",
  pending_customer: "warning",
  resolved: "success",
  closed: "neutral",
};

export const ticketPriorityLabels: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const ticketPriorityTones: Record<TicketPriority, Tone> = {
  low: "neutral",
  normal: "neutral",
  high: "warning",
  urgent: "danger",
};

export const ticketCategoryLabels: Record<TicketCategory, string> = {
  payment: "Payment",
  withdrawal: "Withdrawal",
  kyc: "KYC",
  investment: "Investment",
  other: "Other",
};

const HOUR_MS = 60 * 60 * 1000;

export const responseTargetHours: Record<TicketPriority, number> = {
  urgent: 4,
  high: 8,
  normal: 24,
  low: 72,
};

export function ageLabel(iso: string, now: number): string {
  const elapsed = now - new Date(iso).getTime();
  if (!Number.isFinite(elapsed)) return "—";
  const minutes = Math.floor(Math.max(elapsed, 0) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export type TicketWait = { label: string; tone: Tone; overdue: boolean };

export function ticketWait(ticket: Pick<AdminTicketSummary, "status" | "priority" | "lastMessageAt">, now: number): TicketWait {
  const age = ageLabel(ticket.lastMessageAt, now);
  if (ticket.status !== "open") {
    return { label: ticket.status === "pending_customer" ? `Customer, ${age}` : age, tone: "neutral", overdue: false };
  }
  const elapsedHours = (now - new Date(ticket.lastMessageAt).getTime()) / HOUR_MS;
  const target = responseTargetHours[ticket.priority];
  if (elapsedHours >= target) return { label: `${age}, overdue`, tone: "danger", overdue: true };
  if (elapsedHours >= target / 2) return { label: age, tone: "warning", overdue: false };
  return { label: age, tone: "info", overdue: false };
}
