import {
  payoutBatchStatuses,
  payoutEventSources,
  payoutStatuses,
  withdrawalStatuses,
} from "@nextera/contracts";
import type {
  AdminWithdrawal,
  AdminWithdrawalDetail,
  AdminWithdrawalListResponse,
  PayoutBatch,
  PayoutBatchDetail,
  PayoutBatchListResponse,
  PayoutEvent,
  Payout,
} from "@nextera/contracts";
import { isListOf, isNullableString, isOneOf, isRecord, isString } from "@/lib/shape";

function isWithdrawalDestination(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isString(value.bankAccountId) && isString(value.accountMasked) && isString(value.ifsc) && isString(value.holderName);
}

function isWithdrawal(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    typeof value.amountPaise === "number" &&
    isOneOf(withdrawalStatuses, value.status) &&
    isWithdrawalDestination(value.destination)
  );
}

export function isAdminWithdrawal(value: unknown): value is AdminWithdrawal {
  if (!isWithdrawal(value)) return false;
  const r = value as Record<string, unknown>;
  return isString(r.customerId) && typeof r.attempts === "number";
}

export function isPayout(value: unknown): value is Payout {
  if (!isRecord(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    isString(r.id) &&
    isString(r.withdrawalId) &&
    typeof r.attemptNo === "number" &&
    isString(r.transferId) &&
    isOneOf(payoutStatuses, r.status)
  );
}

export function isPayoutEvent(value: unknown): value is PayoutEvent {
  if (!isRecord(value)) return false;
  const r = value as Record<string, unknown>;
  return isString(r.id) && isString(r.type) && isOneOf(payoutEventSources, r.source);
}

export function isAdminWithdrawalDetail(value: unknown): value is AdminWithdrawalDetail {
  if (!isRecord(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    isAdminWithdrawal(r.withdrawal) &&
    isListOf(r.payouts, isPayout) &&
    isListOf(r.events, isPayoutEvent)
  );
}

export function isAdminWithdrawalList(value: unknown): value is AdminWithdrawalListResponse {
  if (!isRecord(value)) return false;
  return isListOf(value.withdrawals, isAdminWithdrawal) && isNullableString(value.nextCursor);
}

export function isPayoutBatch(value: unknown): value is PayoutBatch {
  if (!isRecord(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    isString(r.id) &&
    isString(r.batchTransferId) &&
    isOneOf(payoutBatchStatuses, r.status) &&
    typeof r.count === "number" &&
    typeof r.totalPaise === "number"
  );
}

export function isPayoutBatchList(value: unknown): value is PayoutBatchListResponse {
  if (!isRecord(value)) return false;
  return isListOf(value.batches, isPayoutBatch) && isNullableString(value.nextCursor);
}

export function isPayoutBatchDetail(value: unknown): value is PayoutBatchDetail {
  if (!isRecord(value)) return false;
  return isPayoutBatch(value.batch) && isListOf(value.withdrawals, isAdminWithdrawal);
}
