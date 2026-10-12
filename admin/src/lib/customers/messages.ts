import type { BackendError } from "@/lib/backend/client";
import { mapAdjustmentFields } from "./adjustment";
import { mapProfileFields } from "./form";
import type { CustomerStatusAction } from "./form";
import { CHECK_FIELDS, addError, failure, mapFields } from "@/lib/actions/outcome";
import type { ActionFailure } from "@/lib/actions/outcome";

const roleRefused = "Your role does not allow this action";

const closedMessage = "This customer is closed. Closed accounts cannot be changed or take new ledger postings.";

function common(error: BackendError): ActionFailure | null {
  if (error.code === "forbidden") return failure("forbidden", error.message || roleRefused);
  if (error.code === "not_found") return failure("not_found", "This customer no longer exists.");
  if (error.code === "customer_closed") return failure("customer_closed", closedMessage);
  if (error.code === "unavailable") return failure("unavailable", error.message);
  if (error.code === "rate_limited") return failure("rate_limited", "Too many requests. Wait a moment and try again.");
  if (error.code === "internal") return failure("internal", "Something went wrong. Please try again.");
  return null;
}

export function profileFailure(error: BackendError): ActionFailure {
  const errors = mapProfileFields(error.fields);
  if (error.code === "conflict" && errors.phone) return failure("conflict", errors.phone[0] ?? error.message, errors);
  if (error.code === "validation") return failure("validation", CHECK_FIELDS, errors);
  if (error.code === "conflict") return failure("conflict", error.message, errors);
  return common(error) ?? failure(error.code, error.message, errors);
}

export function statusFailure(action: CustomerStatusAction, error: BackendError): ActionFailure {
  const errors = mapFields(error.fields, { reason: "reason", closure: "closure" });
  if (action === "close" && error.code === "conflict" && errors.closure?.length) {
    return failure("closure_blocked", "This customer cannot be closed yet:", errors);
  }
  if (error.code === "validation") return failure("validation", CHECK_FIELDS, errors);
  if (error.code === "conflict") return failure("conflict", error.message, errors);
  return common(error) ?? failure(error.code, error.message, errors);
}

export function revokeSessionsFailure(error: BackendError): ActionFailure {
  return common(error) ?? failure(error.code, error.message);
}

export const ADJUSTMENT_MAY_HAVE_POSTED =
  "This adjustment may already have been recorded. Press Try again here (it is safe and cannot post twice). Do not start a new adjustment.";

export function adjustmentOutcomeUnknown(code: string): boolean {
  return code === "unavailable" || code === "internal";
}

export function adjustmentFailure(error: BackendError): ActionFailure {
  const errors = mapAdjustmentFields(error.fields);
  switch (error.code) {
    case "insufficient_funds": {
      const message = "The wallet does not hold enough to cover this debit. Nothing was posted.";
      addError(errors, "amount", "Debit is more than the wallet balance");
      return failure("insufficient_funds", message, errors);
    }
    case "conflict":
      return failure(
        "idempotency_conflict",
        "An adjustment with different details was already recorded from this form. Nothing new was posted. Check the ledger first. If another adjustment is still needed, go Back and review it again to post it as a new one.",
      );
    case "validation":
      return failure("validation", errors._ ? errors._.join(" ") : CHECK_FIELDS, errors);
    case "account_blocked":
      return failure("account_blocked", "This customer is blocked and cannot take adjustments right now.");
    case "unavailable":
    case "internal":
      return failure(error.code, ADJUSTMENT_MAY_HAVE_POSTED);
    default:
      return common(error) ?? failure(error.code, error.message, errors);
  }
}
