import { ActionError } from "@/lib/actions/outcome";
import { isNavigationError } from "@/lib/actions/navigation";

export const APPROVE_MAY_HAVE_BEEN_RECORDED =
  "This approval may already have been recorded. Refresh the withdrawal before trying again.";

export const REJECT_MAY_HAVE_BEEN_RECORDED =
  "This rejection may already have been recorded. Refresh the withdrawal before trying again.";

export const PAY_MAY_HAVE_BEEN_RECORDED =
  "This payout may already have been initiated. Refresh the withdrawal before trying again.";

export const RETRY_MAY_HAVE_BEEN_RECORDED =
  "This retry may already have been initiated. Refresh the withdrawal before trying again.";

export const MARK_FAILED_MAY_HAVE_BEEN_RECORDED =
  "This mark-failed action may already have been recorded. Refresh the withdrawal before trying again.";

export const RESOLVE_REVIEW_MAY_HAVE_BEEN_RECORDED =
  "This resolution may already have been recorded. Refresh the withdrawal before trying again.";

export const BATCH_MAY_HAVE_BEEN_CREATED =
  "The payout batch may already have been created. Refresh the list before trying again.";

export const WITHDRAWAL_GONE = "This withdrawal no longer exists. Go back and refresh.";
export const BATCH_GONE = "This batch no longer exists. Go back and refresh.";
export const PAYOUT_SETTLED_REFRESHED =
  "This payout was already settled by Cashfree; the page has been refreshed.";
export const ACTION_ROLE_REFUSED = "Your role does not allow this action";

const unknownOutcomeCodes = new Set(["unavailable", "internal", "network"]);

export function withdrawalErrorCode(error: unknown): string | null {
  if (!error || isNavigationError(error)) return null;
  if (error instanceof ActionError) return error.code ?? "internal";
  return "network";
}

export function outcomeUnknown(code: string | null): boolean {
  return code !== null && unknownOutcomeCodes.has(code);
}
