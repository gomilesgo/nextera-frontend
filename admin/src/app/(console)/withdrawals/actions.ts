"use server";

import {
  withdrawalBulkApproveSchema,
  withdrawalBulkRejectSchema,
  withdrawalRejectSchema,
  withdrawalReviewResolveSchema,
} from "@nextera/contracts";
import type {
  AdminWithdrawal,
  WithdrawalBulkResponse,
} from "@nextera/contracts";
import type { ActionOutcome } from "@/lib/actions/outcome";
import { CHECK_FIELDS, backendFailure, unexpectedResponse } from "@/lib/actions/server";
import type { BackendError } from "@/lib/backend/client";
import {
  ACTION_ROLE_REFUSED,
  APPROVE_MAY_HAVE_BEEN_RECORDED,
  REJECT_MAY_HAVE_BEEN_RECORDED,
  RESOLVE_REVIEW_MAY_HAVE_BEEN_RECORDED,
  WITHDRAWAL_GONE,
} from "@/lib/withdrawals/messages";
import { isAdminWithdrawal } from "@/lib/withdrawals/shape";
import { authorizeAction, staffRequest } from "@/lib/session";
import { isRecord, isUuid } from "@/lib/shape";

function forbidden(message = ACTION_ROLE_REFUSED): ActionOutcome<never> {
  return { status: "error", code: "forbidden", message };
}

function gone(): ActionOutcome<never> {
  return { status: "error", code: "not_found", message: WITHDRAWAL_GONE };
}

function approveFailure(error: BackendError, unknownMessage: string): ActionOutcome<never> {
  switch (error.code) {
    case "forbidden": return forbidden(error.message || ACTION_ROLE_REFUSED);
    case "not_found": return gone();
    case "conflict": return { status: "error", code: "conflict", message: error.message };
    case "customer_closed": return { status: "error", code: "customer_closed", message: error.message };
    case "unavailable":
    case "internal": return { status: "error", code: error.code, message: unknownMessage };
    default: return backendFailure(error);
  }
}

export type WithdrawalActionResult = ActionOutcome<AdminWithdrawal>;
export type BulkActionResult = ActionOutcome<WithdrawalBulkResponse>;

export async function approveWithdrawal(id: string): Promise<WithdrawalActionResult> {
  const auth = await authorizeAction("withdrawals.write");
  if (!auth.ok) return forbidden(auth.message);
  if (!isUuid(id)) return gone();
  const result = await staffRequest<unknown>(auth.token, `/v1/admin/withdrawals/${id.toLowerCase()}/approve`, { method: "POST" });
  if (!result.ok) return approveFailure(result.error, APPROVE_MAY_HAVE_BEEN_RECORDED);
  return isRecord(result.data) && isAdminWithdrawal(result.data.withdrawal)
    ? { status: "ok", data: result.data.withdrawal }
    : unexpectedResponse("withdrawal");
}

export async function rejectWithdrawal(id: string, reason: string): Promise<WithdrawalActionResult> {
  const auth = await authorizeAction("withdrawals.write");
  if (!auth.ok) return forbidden(auth.message);
  if (!isUuid(id)) return gone();
  const parsed = withdrawalRejectSchema.safeParse({ reason });
  if (!parsed.success) return { status: "error", code: "validation", message: CHECK_FIELDS, errors: { reason: parsed.error.issues.map((i) => i.message) } };
  const result = await staffRequest<unknown>(auth.token, `/v1/admin/withdrawals/${id.toLowerCase()}/reject`, { method: "POST", json: parsed.data });
  if (!result.ok) return approveFailure(result.error, REJECT_MAY_HAVE_BEEN_RECORDED);
  return isRecord(result.data) && isAdminWithdrawal(result.data.withdrawal)
    ? { status: "ok", data: result.data.withdrawal }
    : unexpectedResponse("withdrawal");
}

export async function bulkApproveWithdrawals(ids: string[]): Promise<BulkActionResult> {
  const auth = await authorizeAction("withdrawals.write");
  if (!auth.ok) return forbidden(auth.message);
  const parsed = withdrawalBulkApproveSchema.safeParse({ ids });
  if (!parsed.success) return { status: "error", code: "validation", message: CHECK_FIELDS };
  const result = await staffRequest<unknown>(auth.token, "/v1/admin/withdrawals/bulk/approve", { method: "POST", json: parsed.data });
  if (!result.ok) return approveFailure(result.error, APPROVE_MAY_HAVE_BEEN_RECORDED);
  return isRecord(result.data) && typeof result.data.succeeded === "number"
    ? { status: "ok", data: result.data as WithdrawalBulkResponse }
    : unexpectedResponse("bulk result");
}

export async function bulkRejectWithdrawals(ids: string[], reason: string): Promise<BulkActionResult> {
  const auth = await authorizeAction("withdrawals.write");
  if (!auth.ok) return forbidden(auth.message);
  const parsed = withdrawalBulkRejectSchema.safeParse({ ids, reason });
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.map(String).join(".") || "_";
      (errors[key] ??= []).push(issue.message);
    }
    return { status: "error", code: "validation", message: CHECK_FIELDS, errors };
  }
  const result = await staffRequest<unknown>(auth.token, "/v1/admin/withdrawals/bulk/reject", { method: "POST", json: parsed.data });
  if (!result.ok) return approveFailure(result.error, REJECT_MAY_HAVE_BEEN_RECORDED);
  return isRecord(result.data) && typeof result.data.succeeded === "number"
    ? { status: "ok", data: result.data as WithdrawalBulkResponse }
    : unexpectedResponse("bulk result");
}

export async function resolveWithdrawalReview(id: string, note: string): Promise<WithdrawalActionResult> {
  const auth = await authorizeAction("withdrawals.write");
  if (!auth.ok) return forbidden(auth.message);
  if (!isUuid(id)) return gone();
  const parsed = withdrawalReviewResolveSchema.safeParse({ note });
  if (!parsed.success) return { status: "error", code: "validation", message: CHECK_FIELDS, errors: { note: parsed.error.issues.map((i) => i.message) } };
  const result = await staffRequest<unknown>(auth.token, `/v1/admin/withdrawals/${id.toLowerCase()}/review/resolve`, { method: "POST", json: parsed.data });
  if (!result.ok) return approveFailure(result.error, RESOLVE_REVIEW_MAY_HAVE_BEEN_RECORDED);
  return isRecord(result.data) && isAdminWithdrawal(result.data.withdrawal)
    ? { status: "ok", data: result.data.withdrawal }
    : unexpectedResponse("withdrawal");
}
