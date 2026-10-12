import { ticketStatuses } from "@nextera/contracts";
import type { TicketStatus } from "@nextera/contracts";
import { SUPPORT_ATTACHMENT_FIELD } from "./validation";

export const SUPPORT_TICKETS_PATH = "/v1/support/tickets";
export const TICKET_PAGE_SIZE = 20;

const CURSOR = /^[A-Za-z0-9_-]{1,200}$/;

export function parseStatusFilter(value: unknown): TicketStatus | null {
  return typeof value === "string" && (ticketStatuses as readonly string[]).includes(value) ? (value as TicketStatus) : null;
}

export function isCursor(value: unknown): value is string {
  return typeof value === "string" && CURSOR.test(value);
}

export function ticketListQuery(status: TicketStatus | null, cursor: string | null, limit = TICKET_PAGE_SIZE): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));
  return params.toString();
}

export function ticketListPath(status: TicketStatus | null, cursor: string | null): string {
  return `${SUPPORT_TICKETS_PATH}?${ticketListQuery(status, cursor)}`;
}

export function ticketPath(id: string): string {
  return `${SUPPORT_TICKETS_PATH}/${encodeURIComponent(id)}`;
}

export function ticketMessagesPath(id: string): string {
  return `${ticketPath(id)}/messages`;
}

export function ticketClosePath(id: string): string {
  return `${ticketPath(id)}/close`;
}

export function ticketAttachmentPath(id: string, messageId: string): string {
  return `${ticketMessagesPath(id)}/${encodeURIComponent(messageId)}/attachment`;
}

export function attachmentDownloadHref(id: string, messageId: string): string {
  return `/api/support/tickets/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}/attachment`;
}

export type MessageBody = { json: Record<string, string> } | { form: FormData };

export function messageBody(fields: Record<string, string>, attachment: File | null): MessageBody {
  if (!attachment) return { json: fields };
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  form.set(SUPPORT_ATTACHMENT_FIELD, attachment, attachment.name);
  return { form };
}
