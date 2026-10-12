import { withdrawalStatuses } from "@nextera/contracts";
import type { WithdrawalStatus } from "@nextera/contracts";
import { readParam, toSearchString } from "@/lib/listing/params";
import type { ParamSource } from "@/lib/listing/params";
import { isOneOf, isUuid } from "@/lib/shape";

export const WITHDRAWAL_PAGE_SIZE = 50;

export type WithdrawalListFilters = {
  status?: WithdrawalStatus;
  customerId?: string;
  batchId?: string;
  needsReview?: boolean;
  cursor?: string;
};

export function parseWithdrawalFilters(source: ParamSource): WithdrawalListFilters {
  const status = readParam(source, "status");
  const customerId = readParam(source, "customerId");
  const batchId = readParam(source, "batchId");
  const needsReview = readParam(source, "needsReview");
  return {
    status: isOneOf(withdrawalStatuses, status) ? status : undefined,
    customerId: customerId && isUuid(customerId) ? customerId : undefined,
    batchId: batchId && isUuid(batchId) ? batchId : undefined,
    needsReview: needsReview === "true" ? true : needsReview === "false" ? false : undefined,
  };
}

export function withdrawalListSearch(filters: WithdrawalListFilters, cursor?: string | null): string {
  return toSearchString({
    status: filters.status,
    customerId: filters.customerId,
    batchId: filters.batchId,
    needsReview: filters.needsReview !== undefined ? String(filters.needsReview) : undefined,
    cursor: cursor ?? undefined,
    limit: WITHDRAWAL_PAGE_SIZE,
  });
}

export function batchListSearch(cursor?: string | null): string {
  return toSearchString({ cursor: cursor ?? undefined, limit: WITHDRAWAL_PAGE_SIZE });
}

export function hasWithdrawalFilters(filters: WithdrawalListFilters): boolean {
  return Boolean(filters.status || filters.customerId || filters.batchId || filters.needsReview !== undefined);
}
