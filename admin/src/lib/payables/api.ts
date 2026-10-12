import "server-only";
import {
  payablesCustomerListResponseSchema,
  payablesSummaryResponseSchema,
} from "@nextera/contracts";
import type {
  PayablesCustomerListQuery,
  PayablesCustomerListResponse,
  PayablesSummaryResponse,
} from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { readBackend } from "@/lib/backend/read";
import { toSearchString, withSearch } from "@/lib/listing/params";

export function fetchPayablesSummary(token: string): Promise<BackendResult<PayablesSummaryResponse>> {
  return readBackend(
    token,
    "/v1/admin/payables/summary",
    (data) => {
      const parsed = payablesSummaryResponseSchema.safeParse(data);
      return parsed.success ? parsed.data : null;
    },
    "payables summary",
  );
}

export function fetchPayablesCustomers(
  token: string,
  query: PayablesCustomerListQuery,
): Promise<BackendResult<PayablesCustomerListResponse>> {
  return readBackend(
    token,
    withSearch(
      "/v1/admin/payables/customers",
      toSearchString({ cursor: query.cursor, limit: query.limit, sort: query.sort }),
    ),
    (data) => {
      const parsed = payablesCustomerListResponseSchema.safeParse(data);
      return parsed.success ? parsed.data : null;
    },
    "payables customers",
  );
}

export async function loadPayablesSummary(token: string): Promise<PayablesSummaryResponse | null> {
  const result = await fetchPayablesSummary(token);
  if (!result.ok) return null;
  return result.data;
}

export async function loadPayablesCustomers(
  token: string,
  query: PayablesCustomerListQuery,
): Promise<PayablesCustomerListResponse> {
  const result = await fetchPayablesCustomers(token, query);
  if (!result.ok) return { customers: [], nextCursor: null };
  return result.data;
}
