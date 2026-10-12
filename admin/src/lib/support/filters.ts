import { ticketCategories, ticketPriorities, ticketStatuses } from "@nextera/contracts";
import type { TicketCategory, TicketPriority, TicketStatus } from "@nextera/contracts";
import { pickAssignee, pickOption, pickSearch, resolveAssignee, withSearch } from "@/lib/filters";
import type { AssigneeFilter, SearchParamsRecord } from "@/lib/filters";

export const ALL_STATUSES = "all";
export const DEFAULT_TICKET_STATUS: TicketStatus = "open";

export type TicketStatusFilter = TicketStatus | typeof ALL_STATUSES;

export type TicketFilters = {
  status: TicketStatusFilter;
  category?: TicketCategory;
  priority?: TicketPriority;
  assignee?: AssigneeFilter;
  q?: string;
};

export type TicketListParams = {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assigneeId?: string;
  q?: string;
};

const statusFilters = [...ticketStatuses, ALL_STATUSES] as const;

export function parseTicketFilters(params: SearchParamsRecord): TicketFilters {
  const filters: TicketFilters = { status: pickOption(statusFilters, params.status) ?? DEFAULT_TICKET_STATUS };
  const category = pickOption(ticketCategories, params.category);
  const priority = pickOption(ticketPriorities, params.priority);
  const assignee = pickAssignee(params.assignee);
  const q = pickSearch(params.q);
  if (category) filters.category = category;
  if (priority) filters.priority = priority;
  if (assignee) filters.assignee = assignee;
  if (q) filters.q = q;
  return filters;
}

export function ticketFiltersPath(filters: TicketFilters): string {
  return withSearch("/support", {
    status: filters.status === DEFAULT_TICKET_STATUS ? undefined : filters.status,
    category: filters.category,
    priority: filters.priority,
    assignee: filters.assignee,
    q: filters.q,
  });
}

export function ticketListParams(filters: TicketFilters, meId: string): TicketListParams {
  const params: TicketListParams = {};
  if (filters.status !== ALL_STATUSES) params.status = filters.status;
  if (filters.category) params.category = filters.category;
  if (filters.priority) params.priority = filters.priority;
  const assigneeId = resolveAssignee(filters.assignee, meId);
  if (assigneeId) params.assigneeId = assigneeId;
  if (filters.q) params.q = filters.q;
  return params;
}

export function hasTicketFilters(filters: TicketFilters): boolean {
  return Boolean(filters.category || filters.priority || filters.assignee || filters.q);
}
