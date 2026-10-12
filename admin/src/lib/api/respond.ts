import type { BackendError, BackendErrorCode } from "@/lib/backend/client";
import { can } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";
import type { AdminStaff } from "@/lib/staff";

const statusByCode: Partial<Record<BackendErrorCode, number>> = {
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  insufficient_funds: 422,
  account_blocked: 403,
  account_locked: 423,
  bank_account_invalid: 422,
  kyc_not_verified: 422,
  provider_unavailable: 502,
  sms_failed: 502,
  unavailable: 503,
  password_change_required: 403,
  internal: 500,
};

const noStore = { "cache-control": "no-store" };

export function jsonNoStore(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: noStore });
}

export function errorStatus(error: BackendError, upstreamStatus?: number): number {
  const mapped = statusByCode[error.code];
  if (mapped) return mapped;
  if (upstreamStatus && upstreamStatus >= 400 && upstreamStatus < 600) return upstreamStatus;
  return 500;
}

export function errorResponse(error: BackendError, upstreamStatus?: number): Response {
  const status = errorStatus(error, upstreamStatus);
  const body = {
    error: {
      code: error.code,
      message: error.code === "internal" ? "Something went wrong" : error.message,
      ...(error.fields ? { fields: error.fields } : {}),
      ...(error.retryAfterSeconds !== undefined ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
    },
  };
  const headers: Record<string, string> = { ...noStore };
  if (error.retryAfterSeconds !== undefined) headers["retry-after"] = String(error.retryAfterSeconds);
  return Response.json(body, { status, headers });
}

export type HandlerSession =
  | { status: "signed_in"; staff: AdminStaff; token: string }
  | { status: "anonymous" }
  | { status: "expired" }
  | { status: "error"; error: BackendError };

export function sessionFailure(
  session: HandlerSession,
  permission: Permission | null,
): Response | null {
  if (session.status === "anonymous" || session.status === "expired") {
    return errorResponse({ code: "unauthorized", message: "Your session has expired. Please sign in again." });
  }
  if (session.status === "error") return errorResponse(session.error);
  if (permission && session.staff.mustChangePassword) {
    return errorResponse({ code: "password_change_required", message: "Change your password to continue." });
  }
  if (permission && !can(session.staff.role, permission)) {
    return errorResponse({ code: "forbidden", message: "Your role does not allow this action" });
  }
  return null;
}
