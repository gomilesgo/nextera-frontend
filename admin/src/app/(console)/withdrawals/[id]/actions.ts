"use server";

import { payoutMarkFailedSchema, withdrawalPaySchema } from "@nextera/contracts";
import type { AdminWithdrawal } from "@nextera/contracts";
import type { ActionOutcome } from "@/lib/actions/outcome";
import { CHECK_FIELDS, backendFailure, unexpectedResponse } from "@/lib/actions/server";
import type { BackendError } from "@/lib/backend/client";
import {
  ACTION_ROLE_REFUSED,
  MARK_FAILED_MAY_HAVE_BEEN_RECORDED,
  PAY_MAY_HAVE_BEEN_RECORDED,
  PAYOUT_SETTLED_REFRESHED,
  RETRY_MAY_HAVE_BEEN_RECORDED,
  WITHDRAWAL_GONE,
} from "@/lib/withdrawals/messages";
import { isAdminWithdrawal } from "@/lib/withdrawals/shape";
import { authorizeAction, staffRequest } from "@/lib/session";
import { isRecord, isUuid } from "@/lib/shape";

export type WithdrawalPayResult = ActionOutcome<AdminWithdrawal>;

function forbidden(message = ACTION_ROLE_REFUSED): ActionOutcome<never> {
  return { status: "error", code: "forbidden", message };
}

function gone(): ActionOutcome<never> {
  return { status: "error", code: "not_found", message: WITHDRAWAL_GONE };
}

function payFailure(error: BackendError, unknownMessage: string): ActionOutcome<never> {
  switch (error.code) {
    case "forbidden": return forbidden(error.message || ACTION_ROLE_REFUSED);
    case "not_found": return gone();
    case "conflict": return { status: "error", code: "conflict", message: error.message };
    case "customer_closed": return { status: "error", code: "customer_closed", message: error.message };
    case "kyc_not_verified": return { status: "error", code: "kyc_not_verified", message: error.message };
    case "payout_on_hold": return { status: "error", code: "payout_on_hold", message: error.message };
    case "payout_settled": return { status: "error", code: "payout_settled", message: PAYOUT_SETTLED_REFRESHED };
    case "bank_account_changed": return { status: "error", code: "bank_account_changed", message: error.message };
    case "provider_unavailable": return { status: "error", code: "provider_unavailable", message: error.message };
    case "unavailable":
    case "internal": return { status: "error", code: error.code, message: unknownMessage };
    default: return backendFailure(error);
  }
}

function extractWithdrawal(data: unknown): ActionOutcome<AdminWithdrawal> {
  return isRecord(data) && isAdminWithdrawal(data.withdrawal)
    ? { status: "ok", data: data.withdrawal }
    : unexpectedResponse("withdrawal");
}

export async function payWithdrawal(
  id: string,
  overrideBlocked: boolean,
  overrideReason?: string,
): Promise<WithdrawalPayResult> {
  const permission = overrideBlocked ? "withdrawals.override" : "withdrawals.write";
  const auth = await authorizeAction(permission);
  if (!auth.ok) return forbidden(auth.message);
  if (!isUuid(id)) return gone();
  const parsed = withdrawalPaySchema.safeParse({ overrideBlocked, overrideReason });
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      (errors[issue.path.map(String).join(".") || "_"] ??= []).push(issue.message);
    }
    return { status: "error", code: "validation", message: CHECK_FIELDS, errors };
  }
  const result = await staffRequest<unknown>(auth.token, `/v1/admin/withdrawals/${id.toLowerCase()}/pay`, { method: "POST", json: parsed.data });
  if (!result.ok) return payFailure(result.error, PAY_MAY_HAVE_BEEN_RECORDED);
  return extractWithdrawal(result.data);
}

export async function retryWithdrawal(
  id: string,
  overrideBlocked: boolean,
  overrideReason?: string,
): Promise<WithdrawalPayResult> {
  const permission = overrideBlocked ? "withdrawals.override" : "withdrawals.write";
  const auth = await authorizeAction(permission);
  if (!auth.ok) return forbidden(auth.message);
  if (!isUuid(id)) return gone();
  const parsed = withdrawalPaySchema.safeParse({ overrideBlocked, overrideReason });
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      (errors[issue.path.map(String).join(".") || "_"] ??= []).push(issue.message);
    }
    return { status: "error", code: "validation", message: CHECK_FIELDS, errors };
  }
  const result = await staffRequest<unknown>(auth.token, `/v1/admin/withdrawals/${id.toLowerCase()}/retry`, { method: "POST", json: parsed.data });
  if (!result.ok) return payFailure(result.error, RETRY_MAY_HAVE_BEEN_RECORDED);
  return extractWithdrawal(result.data);
}

export async function markWithdrawalFailed(id: string, reason: string): Promise<WithdrawalPayResult> {
  const auth = await authorizeAction("withdrawals.override");
  if (!auth.ok) return forbidden(auth.message);
  if (!isUuid(id)) return gone();
  const parsed = payoutMarkFailedSchema.safeParse({ reason });
  if (!parsed.success) {
    return { status: "error", code: "validation", message: CHECK_FIELDS, errors: { reason: parsed.error.issues.map((i) => i.message) } };
  }
  const result = await staffRequest<unknown>(auth.token, `/v1/admin/withdrawals/${id.toLowerCase()}/mark-failed`, { method: "POST", json: parsed.data });
  if (!result.ok) return payFailure(result.error, MARK_FAILED_MAY_HAVE_BEEN_RECORDED);
  return extractWithdrawal(result.data);
}
