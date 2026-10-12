import "server-only";
import type {
  AdminWithdrawalDetail,
  AdminWithdrawalListResponse,
  PayoutBatchDetail,
  PayoutBatchListResponse,
} from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { notFound, readBackend, unwrapForPage } from "@/lib/backend/read";
import { withSearch } from "@/lib/listing/params";
import { isUuid } from "@/lib/shape";
import { batchListSearch, withdrawalListSearch } from "./filters";
import type { WithdrawalListFilters } from "./filters";
import {
  isAdminWithdrawalDetail,
  isAdminWithdrawalList,
  isPayoutBatchDetail,
  isPayoutBatchList,
} from "./shape";

export function fetchWithdrawals(
  token: string,
  filters: WithdrawalListFilters,
  cursor?: string | null,
): Promise<BackendResult<AdminWithdrawalListResponse>> {
  return readBackend(
    token,
    withSearch("/v1/admin/withdrawals", withdrawalListSearch(filters, cursor)),
    (data) => (isAdminWithdrawalList(data) ? data : null),
    "withdrawal list",
  );
}

export async function fetchWithdrawalDetail(
  token: string,
  id: string,
): Promise<BackendResult<AdminWithdrawalDetail>> {
  if (!isUuid(id)) return notFound("Withdrawal not found");
  return readBackend(
    token,
    `/v1/admin/withdrawals/${id.toLowerCase()}`,
    (data) => (isAdminWithdrawalDetail(data) ? data : null),
    "withdrawal",
  );
}

export function fetchBatches(
  token: string,
  cursor?: string | null,
): Promise<BackendResult<PayoutBatchListResponse>> {
  return readBackend(
    token,
    withSearch("/v1/admin/withdrawals/batches", batchListSearch(cursor)),
    (data) => (isPayoutBatchList(data) ? data : null),
    "payout batch list",
  );
}

export async function fetchBatchDetail(
  token: string,
  id: string,
): Promise<BackendResult<PayoutBatchDetail>> {
  if (!isUuid(id)) return notFound("Payout batch not found");
  return readBackend(
    token,
    `/v1/admin/withdrawals/batches/${id.toLowerCase()}`,
    (data) => (isPayoutBatchDetail(data) ? data : null),
    "payout batch",
  );
}

export async function loadWithdrawals(
  token: string,
  filters: WithdrawalListFilters,
  cursor?: string | null,
): Promise<AdminWithdrawalListResponse> {
  return unwrapForPage(await fetchWithdrawals(token, filters, cursor)) ?? { withdrawals: [], nextCursor: null };
}

export async function loadWithdrawalDetail(token: string, id: string): Promise<AdminWithdrawalDetail | null> {
  return unwrapForPage(await fetchWithdrawalDetail(token, id));
}

export async function loadBatches(
  token: string,
  cursor?: string | null,
): Promise<PayoutBatchListResponse> {
  return unwrapForPage(await fetchBatches(token, cursor)) ?? { batches: [], nextCursor: null };
}

export async function loadBatchDetail(token: string, id: string): Promise<PayoutBatchDetail | null> {
  return unwrapForPage(await fetchBatchDetail(token, id));
}
