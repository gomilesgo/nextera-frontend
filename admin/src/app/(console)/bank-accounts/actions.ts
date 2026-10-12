"use server";

import { bankRejectSchema } from "@nextera/contracts";
import type { AdminBankAccount } from "@nextera/contracts";
import type { ActionOutcome } from "@/lib/actions/outcome";
import { issuesToFields } from "@/lib/actions/outcome";
import { CHECK_FIELDS, backendFailure, unexpectedResponse } from "@/lib/actions/server";
import { isAdminBankAccount } from "@/lib/bank/shape";
import { authorizeAction, staffRequest } from "@/lib/session";
import { isRecord, isUuid } from "@/lib/shape";

export type BankDecisionResult = ActionOutcome<AdminBankAccount>;

async function decide(accountId: string, decision: "approve" | "reject", json?: unknown): Promise<BankDecisionResult> {
  const auth = await authorizeAction("bank.review");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };
  if (!isUuid(accountId)) return { status: "error", code: "not_found", message: "Bank account not found" };

  let body = json;
  if (decision === "reject") {
    const parsed = bankRejectSchema.safeParse(json);
    if (!parsed.success) {
      return { status: "error", code: "validation", message: CHECK_FIELDS, errors: issuesToFields(parsed.error.issues) };
    }
    body = parsed.data;
  }

  const result = await staffRequest<unknown>(auth.token, `/v1/admin/bank-accounts/${accountId}/${decision}`, {
    method: "POST",
    ...(body === undefined ? {} : { json: body }),
  });
  if (!result.ok) return backendFailure(result.error);
  const account = isRecord(result.data) ? result.data.account : null;
  return isAdminBankAccount(account) ? { status: "ok", data: account } : unexpectedResponse("bank account");
}

export async function approveBankAccount(accountId: string): Promise<BankDecisionResult> {
  return decide(accountId, "approve");
}

export async function rejectBankAccount(accountId: string, reason: string): Promise<BankDecisionResult> {
  return decide(accountId, "reject", { reason });
}
