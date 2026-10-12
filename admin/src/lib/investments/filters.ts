import { investmentStatuses } from "@nextera/contracts";
import type { InvestmentStatus } from "@nextera/contracts";
import { readParam, toSearchString, withSearch } from "@/lib/listing/params";
import type { ParamSource } from "@/lib/listing/params";
import { isOneOf, isUuid } from "@/lib/shape";

export const INVESTMENT_PAGE_SIZE = 50;
export const CUSTOMER_SEARCH_MAX = 100;

export type InvestmentListFilters = {
  status?: InvestmentStatus;
  planId?: string;
  customerId?: string;
};

export type InvestmentFilters = InvestmentListFilters & {
  customerSearch?: string;
};

function clean(value: string | undefined): string | undefined {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text : undefined;
}

export function parseInvestmentFilters(params: ParamSource): InvestmentFilters {
  const filters: InvestmentFilters = {};
  const status = readParam(params, "status");
  if (isOneOf(investmentStatuses, status)) filters.status = status;
  const plan = clean(readParam(params, "plan"));
  if (isUuid(plan)) filters.planId = plan.toLowerCase();
  const customer = clean(readParam(params, "customer"));
  if (customer && isUuid(customer)) filters.customerId = customer.toLowerCase();
  else if (customer) filters.customerSearch = customer.slice(0, CUSTOMER_SEARCH_MAX).trim();
  return filters;
}

export function listFilters(filters: InvestmentFilters): InvestmentListFilters {
  const list: InvestmentListFilters = {};
  if (filters.status) list.status = filters.status;
  if (filters.planId) list.planId = filters.planId;
  if (filters.customerId) list.customerId = filters.customerId;
  return list;
}

export function investmentsHref(filters: InvestmentFilters): string {
  return withSearch(
    "/investments",
    toSearchString({
      status: filters.status,
      plan: filters.planId,
      customer: filters.customerId ?? filters.customerSearch,
    }),
  );
}

export function investmentListSearch(filters: InvestmentListFilters, cursor: string | null, limit: number): string {
  return toSearchString({
    status: filters.status,
    planId: filters.planId,
    customerId: filters.customerId,
    cursor: cursor ?? undefined,
    limit,
  });
}

export function hasFilters(filters: InvestmentFilters): boolean {
  return Boolean(filters.status || filters.planId || filters.customerId || filters.customerSearch);
}
