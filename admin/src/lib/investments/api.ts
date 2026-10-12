import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { AdminCustomer, AdminInvestmentQuery } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { notFound, readBackend, unwrapForPage } from "@/lib/backend/read";
import { fetchCustomers, loadCustomer } from "@/lib/customers/api";
import { withSearch } from "@/lib/listing/params";
import type { InvestmentDetailResponse, InvestmentListPage } from "@/lib/queries/investments";
import { isListOf, isNullableString, isRecord, isUuid } from "@/lib/shape";
import { investmentListSearch } from "./filters";
import { isAdminInvestment, isAdminInvestmentDetail } from "./shape";

export const CUSTOMER_MATCH_LIMIT = 8;

export function fetchInvestments(token: string, query: AdminInvestmentQuery): Promise<BackendResult<InvestmentListPage>> {
  return readBackend(
    token,
    withSearch("/v1/admin/investments", investmentListSearch(query, query.cursor ?? null, query.limit)),
    (data) =>
      isRecord(data) && isListOf(data.investments, isAdminInvestment) && isNullableString(data.nextCursor)
        ? { investments: data.investments, nextCursor: data.nextCursor }
        : null,
    "investment list",
  );
}

export async function fetchInvestmentDetail(token: string, id: string): Promise<BackendResult<InvestmentDetailResponse>> {
  if (!isUuid(id)) return notFound("Investment not found");
  return readBackend(
    token,
    `/v1/admin/investments/${id.toLowerCase()}`,
    (data) => (isAdminInvestmentDetail(data) ? data : null),
    "investment",
  );
}

export async function loadInvestments(token: string, query: AdminInvestmentQuery): Promise<InvestmentListPage> {
  return unwrapForPage(await fetchInvestments(token, query)) ?? { investments: [], nextCursor: null };
}

export async function loadInvestmentDetail(token: string, id: string): Promise<InvestmentDetailResponse | null> {
  return unwrapForPage(await fetchInvestmentDetail(token, id));
}

export async function loadCustomerMatches(token: string, search: string): Promise<AdminCustomer[] | null> {
  const result = await fetchCustomers(token, { q: search, limit: CUSTOMER_MATCH_LIMIT, offset: 0 });
  if (!result.ok && result.error.code !== "unauthorized" && result.error.code !== "password_change_required") return null;
  return unwrapForPage(result)?.items ?? [];
}

export async function loadCustomerOrNull(token: string, customerId: string): Promise<AdminCustomer | null> {
  try {
    return (await loadCustomer(token, customerId))?.customer ?? null;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}
