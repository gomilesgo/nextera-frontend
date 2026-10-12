"use server";

import { payoutBatchCreateSchema } from "@nextera/contracts";
import type { PayoutBatchResponse } from "@nextera/contracts";
import type { ActionOutcome } from "@/lib/actions/outcome";
import { CHECK_FIELDS, backendFailure, unexpectedResponse } from "@/lib/actions/server";
import type { BackendError } from "@/lib/backend/client";
import {
  ACTION_ROLE_REFUSED,
  BATCH_MAY_HAVE_BEEN_CREATED,
} from "@/lib/withdrawals/messages";
import { authorizeAction, staffRequest } from "@/lib/session";
import { isRecord } from "@/lib/shape";

export type CreateBatchResult = ActionOutcome<PayoutBatchResponse>;

function forbidden(message = ACTION_ROLE_REFUSED): ActionOutcome<never> {
  return { status: "error", code: "forbidden", message };
}

function batchFailure(error: BackendError): ActionOutcome<never> {
  switch (error.code) {
    case "forbidden": return forbidden(error.message || ACTION_ROLE_REFUSED);
    case "conflict": return { status: "error", code: "conflict", message: error.message };
    case "unavailable":
    case "internal": return { status: "error", code: error.code, message: BATCH_MAY_HAVE_BEEN_CREATED };
    default: return backendFailure(error);
  }
}

export async function createPayoutBatch(
  ids: string[],
  overrideWithdrawalIds: string[] = [],
  overrideReason?: string,
): Promise<CreateBatchResult> {
  const auth = await authorizeAction(overrideWithdrawalIds.length > 0 ? "withdrawals.override" : "withdrawals.write");
  if (!auth.ok) return forbidden(auth.message);
  const parsed = payoutBatchCreateSchema.safeParse({ ids, overrideWithdrawalIds, overrideReason });
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      (errors[issue.path.map(String).join(".") || "_"] ??= []).push(issue.message);
    }
    return { status: "error", code: "validation", message: CHECK_FIELDS, errors };
  }
  const result = await staffRequest<unknown>(auth.token, "/v1/admin/withdrawals/batches", { method: "POST", json: parsed.data });
  if (!result.ok) return batchFailure(result.error);
  const data = result.data;
  if (!isRecord(data) || typeof data.succeeded !== "number") return unexpectedResponse("batch result");
  return { status: "ok", data: data as PayoutBatchResponse };
}
