import { ticketCategories, ticketPriorities, ticketStatuses } from "@nextera/contracts";
import type {
  TicketAttachment,
  TicketDetailResponse,
  TicketListResponse,
  TicketMessage,
  TicketMessageResponse,
  TicketResponse,
  TicketSummary,
} from "@nextera/contracts";

type Raw = Record<string, unknown>;

function record(value: unknown): Raw | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function oneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function toTicketSummary(raw: unknown): TicketSummary | null {
  const value = record(raw);
  if (
    !value ||
    typeof value.id !== "string" ||
    typeof value.ref !== "string" ||
    typeof value.subject !== "string" ||
    !oneOf(ticketCategories, value.category) ||
    !oneOf(ticketStatuses, value.status) ||
    !oneOf(ticketPriorities, value.priority) ||
    !isTimestamp(value.lastMessageAt) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt) ||
    (value.closedAt !== null && !isTimestamp(value.closedAt))
  ) {
    return null;
  }
  return {
    id: value.id,
    ref: value.ref,
    subject: value.subject,
    category: value.category,
    status: value.status,
    priority: value.priority,
    lastMessageAt: value.lastMessageAt,
    closedAt: value.closedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function toAttachment(raw: unknown): TicketAttachment | null | undefined {
  if (raw === null) return null;
  const value = record(raw);
  if (
    !value ||
    typeof value.name !== "string" ||
    typeof value.contentType !== "string" ||
    typeof value.sizeBytes !== "number" ||
    !Number.isSafeInteger(value.sizeBytes)
  ) {
    return undefined;
  }
  return { name: value.name, contentType: value.contentType, sizeBytes: value.sizeBytes };
}

export function toTicketMessage(raw: unknown): TicketMessage | null {
  const value = record(raw);
  if (
    !value ||
    typeof value.id !== "string" ||
    (value.authorType !== "customer" && value.authorType !== "staff") ||
    typeof value.body !== "string" ||
    !isTimestamp(value.createdAt)
  ) {
    return null;
  }
  const attachment = toAttachment(value.attachment ?? null);
  if (attachment === undefined) return null;
  return { id: value.id, authorType: value.authorType, body: value.body, attachment, createdAt: value.createdAt };
}

function every<T>(list: unknown, parse: (raw: unknown) => T | null): T[] | null {
  if (!Array.isArray(list)) return null;
  const parsed: T[] = [];
  for (const item of list) {
    const value = parse(item);
    if (value === null) return null;
    parsed.push(value);
  }
  return parsed;
}

export function toTicketList(raw: unknown): TicketListResponse | null {
  const value = record(raw);
  if (!value) return null;
  const items = every(value.items, toTicketSummary);
  if (!items) return null;
  if (value.nextCursor !== null && typeof value.nextCursor !== "string") return null;
  return { items, nextCursor: value.nextCursor };
}

export function toTicketDetail(raw: unknown): TicketDetailResponse | null {
  const value = record(raw);
  const ticket = toTicketSummary(value?.ticket);
  const messages = every(value?.messages, toTicketMessage);
  return ticket && messages ? { ticket, messages } : null;
}

export function toTicketResponse(raw: unknown): TicketResponse | null {
  const ticket = toTicketSummary(record(raw)?.ticket);
  return ticket ? { ticket } : null;
}

export function toTicketMessageResponse(raw: unknown): TicketMessageResponse | null {
  const value = record(raw);
  const ticket = toTicketSummary(value?.ticket);
  const message = toTicketMessage(value?.message);
  return ticket && message ? { ticket, message } : null;
}
