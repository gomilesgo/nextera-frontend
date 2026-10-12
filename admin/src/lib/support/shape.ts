import { ticketCategories, ticketPriorities, ticketStatuses } from "@nextera/contracts";
import type {
  AdminTicketDetailResponse,
  AdminTicketListResponse,
  AdminTicketMessage,
  AdminTicketMessageResponse,
  AdminTicketResponse,
  AdminTicketSummary,
  TicketAttachment,
} from "@nextera/contracts";
import { isCustomerProfile, isStaffRef } from "@/lib/leads/shape";
import { isListOf, isNullableString, isOneOf, isRecord, isString, isUuid } from "@/lib/shape";

function isNullableUuid(value: unknown): value is string | null {
  return value === null || isUuid(value);
}

function isTicketAttachment(value: unknown): value is TicketAttachment {
  return (
    isRecord(value) &&
    isString(value.name) &&
    isString(value.contentType) &&
    typeof value.sizeBytes === "number" &&
    Number.isFinite(value.sizeBytes)
  );
}

export function isAdminTicketSummary(value: unknown): value is AdminTicketSummary {
  if (!isRecord(value)) return false;
  const customer = value.customer;
  return (
    isUuid(value.id) &&
    isString(value.ref) &&
    isString(value.subject) &&
    isOneOf(ticketCategories, value.category) &&
    isOneOf(ticketStatuses, value.status) &&
    isOneOf(ticketPriorities, value.priority) &&
    isString(value.lastMessageAt) &&
    isNullableString(value.closedAt) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isRecord(customer) &&
    isUuid(customer.id) &&
    isString(customer.phone) &&
    isNullableString(customer.name) &&
    (value.assignee === null || isStaffRef(value.assignee)) &&
    isNullableUuid(value.investmentId) &&
    isNullableUuid(value.withdrawalId)
  );
}

export function isAdminTicketMessage(value: unknown): value is AdminTicketMessage {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    (value.authorType === "customer" || value.authorType === "staff") &&
    isString(value.body) &&
    (value.attachment === null || isTicketAttachment(value.attachment)) &&
    isString(value.createdAt) &&
    isString(value.authorId) &&
    isNullableString(value.authorName) &&
    typeof value.internal === "boolean"
  );
}

export function isAdminTicketList(value: unknown): value is AdminTicketListResponse {
  return isRecord(value) && isListOf(value.items, isAdminTicketSummary) && isNullableString(value.nextCursor);
}

export function isAdminTicketDetail(value: unknown): value is AdminTicketDetailResponse {
  return (
    isRecord(value) &&
    isAdminTicketSummary(value.ticket) &&
    isCustomerProfile(value.customer) &&
    isListOf(value.messages, isAdminTicketMessage)
  );
}

export function isAdminTicketResponse(value: unknown): value is AdminTicketResponse {
  return isRecord(value) && isAdminTicketSummary(value.ticket);
}

export function isAdminTicketMessageResponse(value: unknown): value is AdminTicketMessageResponse {
  return isRecord(value) && isAdminTicketSummary(value.ticket) && isAdminTicketMessage(value.message);
}
