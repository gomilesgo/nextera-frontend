"use server";

import type { PaymentEvent } from "@nextera/contracts";
import type { ActionOutcome } from "@/lib/actions/outcome";
import { CHECK_FIELDS, backendFailure } from "@/lib/actions/server";
import type { BackendError } from "@/lib/backend/client";
import {
  FLAG_GONE,
  RESOLUTION_MAY_HAVE_BEEN_RECORDED,
  RESOLVE_FAILED,
  RESOLVE_RATE_LIMITED,
  RESOLVE_ROLE_REFUSED,
} from "@/lib/payments/messages";
import { parseResolution } from "@/lib/payments/resolve";
import { isPaymentFlag } from "@/lib/payments/shape";
import { authorizeAction, staffRequest } from "@/lib/session";
import { isRecord, isUuid } from "@/lib/shape";

export type ResolveFlagResult = ActionOutcome<PaymentEvent>;

const missing: ResolveFlagResult = { status: "error", code: "not_found", message: FLAG_GONE };

function fail(code: string, message: string): ResolveFlagResult {
  return { status: "error", code, message };
}

function resolveFailure(error: BackendError): ResolveFlagResult {
  switch (error.code) {
    case "not_found":
      return missing;
    case "conflict":
      return fail("conflict", error.message);
    case "validation":
      return backendFailure(error);
    case "forbidden":
      return fail("forbidden", RESOLVE_ROLE_REFUSED);
    case "rate_limited":
      return fail("rate_limited", RESOLVE_RATE_LIMITED);
    case "unavailable":
    case "internal":
      return fail(error.code, RESOLUTION_MAY_HAVE_BEEN_RECORDED);
    default:
      return fail(error.code, RESOLVE_FAILED);
  }
}

export async function resolvePaymentFlag(flagId: string, input: unknown): Promise<ResolveFlagResult> {
  const auth = await authorizeAction("payments.resolve");
  if (!auth.ok) return fail("forbidden", auth.message);
  if (!isUuid(flagId)) return missing;

  const parsed = parseResolution(input);
  if (!parsed.ok) return { status: "error", code: "validation", message: CHECK_FIELDS, errors: parsed.errors };

  const result = await staffRequest<unknown>(auth.token, `/v1/admin/payments/flags/${flagId.toLowerCase()}/resolve`, {
    method: "POST",
    json: parsed.data,
  });
  if (!result.ok) return resolveFailure(result.error);
  return isRecord(result.data) && isPaymentFlag(result.data.flag)
    ? { status: "ok", data: result.data.flag }
    : fail("internal", RESOLUTION_MAY_HAVE_BEEN_RECORDED);
}
