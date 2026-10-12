import { leadStatuses } from "@nextera/contracts";
import type { LeadStatus } from "@nextera/contracts";
import { pickAssignee, pickDate, pickOption, pickSearch, resolveAssignee, withSearch } from "@/lib/filters";
import type { AssigneeFilter, SearchParamsRecord } from "@/lib/filters";

export type LeadFilters = {
  status?: LeadStatus;
  q?: string;
  from?: string;
  to?: string;
  assignee?: AssigneeFilter;
};

export type LeadListParams = {
  status?: LeadStatus;
  q?: string;
  from?: string;
  to?: string;
  assigneeId?: string;
};

export function parseLeadFilters(params: SearchParamsRecord): LeadFilters {
  const filters: LeadFilters = {};
  const status = pickOption(leadStatuses, params.status);
  const q = pickSearch(params.q);
  let from = pickDate(params.from);
  let to = pickDate(params.to);
  if (from && to && from > to) {
    from = undefined;
    to = undefined;
  }
  const assignee = pickAssignee(params.assignee);
  if (status) filters.status = status;
  if (q) filters.q = q;
  if (from) filters.from = from;
  if (to) filters.to = to;
  if (assignee) filters.assignee = assignee;
  return filters;
}

export function leadFiltersPath(filters: LeadFilters): string {
  return withSearch("/leads", {
    status: filters.status,
    q: filters.q,
    from: filters.from,
    to: filters.to,
    assignee: filters.assignee,
  });
}

export function leadListParams(filters: LeadFilters, meId: string): LeadListParams {
  const params: LeadListParams = {};
  if (filters.status) params.status = filters.status;
  if (filters.q) params.q = filters.q;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  const assigneeId = resolveAssignee(filters.assignee, meId);
  if (assigneeId) params.assigneeId = assigneeId;
  return params;
}

export function hasLeadFilters(filters: LeadFilters): boolean {
  return Object.keys(filters).length > 0;
}
