"use server";

import { kycRejectSchema } from "@nextera/contracts";
import type { CustomerKycResponse } from "@nextera/contracts";
import type { ActionOutcome } from "@/lib/actions/outcome";
import { issuesToFields } from "@/lib/actions/outcome";
import { CHECK_FIELDS, backendFailure, unexpectedResponse } from "@/lib/actions/server";
import { isCustomerKycResponse } from "@/lib/kyc/shape";
import { authorizeAction, staffRequest } from "@/lib/session";
import { isUuid } from "@/lib/shape";

export type KycDecisionResult = ActionOutcome<CustomerKycResponse>;

const missing: KycDecisionResult = { status: "error", code: "not_found", message: "Customer not found" };

async function decide(customerId: string, decision: "approve" | "reject", json?: unknown): Promise<KycDecisionResult> {
  const auth = await authorizeAction("kyc.review");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };
  if (!isUuid(customerId)) return missing;

  let body = json;
  if (decision === "reject") {
    const parsed = kycRejectSchema.safeParse(json);
    if (!parsed.success) {
      return { status: "error", code: "validation", message: CHECK_FIELDS, errors: issuesToFields(parsed.error.issues) };
    }
    body = parsed.data;
  }

  const result = await staffRequest<unknown>(auth.token, `/v1/admin/customers/${customerId}/kyc/${decision}`, {
    method: "POST",
    ...(body === undefined ? {} : { json: body }),
  });
  if (!result.ok) return backendFailure(result.error);
  return isCustomerKycResponse(result.data) ? { status: "ok", data: result.data } : unexpectedResponse("KYC record");
}

export async function approveKyc(customerId: string): Promise<KycDecisionResult> {
  return decide(customerId, "approve");
}

export async function rejectKyc(customerId: string, reason: string): Promise<KycDecisionResult> {
  return decide(customerId, "reject", { reason });
}
