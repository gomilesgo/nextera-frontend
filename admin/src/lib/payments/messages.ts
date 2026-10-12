import { ActionError } from "@/lib/actions/outcome";
import { isNavigationError } from "@/lib/actions/navigation";

export const RESOLUTION_MAY_HAVE_BEEN_RECORDED =
  "This resolution may already have been recorded. Refresh the flag before trying again.";
export const FLAG_GONE = "This flag no longer exists. Go back to the queue and refresh it.";
export const RESOLVE_ROLE_REFUSED = "Your role does not allow this action";
export const RESOLVE_RATE_LIMITED = "Too many requests. Wait a moment and try again.";
export const RESOLVE_FAILED = "The flag could not be resolved. Please try again.";

const unknownOutcomeCodes = new Set(["unavailable", "internal", "network"]);
const refreshCodes = new Set(["conflict", ...unknownOutcomeCodes]);

export function resolveErrorCode(error: unknown): string | null {
  if (!error || isNavigationError(error)) return null;
  if (error instanceof ActionError) return error.code ?? "internal";
  return "network";
}

export function resolutionOutcomeUnknown(code: string | null): boolean {
  return code !== null && unknownOutcomeCodes.has(code);
}

export function shouldRefreshFlag(code: string | null): boolean {
  return code !== null && refreshCodes.has(code);
}

export function resolveErrorMessage(error: unknown): string | null {
  const code = resolveErrorCode(error);
  if (code === null) return null;
  if (resolutionOutcomeUnknown(code)) return RESOLUTION_MAY_HAVE_BEEN_RECORDED;
  return error instanceof ActionError ? error.message : RESOLVE_FAILED;
}
