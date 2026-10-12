import "server-only";
import type { ActionFailure } from "@/lib/actionResult";
import { errorStatus } from "@/lib/api/respond";
import type { BackendError, BackendResult } from "@/lib/backend/client";
import { callBackend } from "@/lib/backend/server";
import type { VisitorRequest } from "@/lib/backend/server";
import { GENERIC_MESSAGES, logBackendError, logServiceKeyRejected, publicMessage, serviceKeyRejected } from "@/lib/safeErrors";
import { clearSession, readSessionToken } from "@/lib/session";

const signedOut: BackendResult<never> = {
  ok: false,
  status: 401,
  error: { code: "unauthorized", message: GENERIC_MESSAGES.unauthorized },
};

export async function portalCall<T>(path: string, init: Omit<VisitorRequest, "token">, context: string): Promise<BackendResult<T>> {
  const token = await readSessionToken();
  if (!token) return signedOut;
  const result = await callBackend<T>(path, { ...init, token });
  if (!result.ok && result.error.code === "unauthorized") {
    if (await serviceKeyRejected((ping) => callBackend(ping))) {
      logServiceKeyRejected(context);
      return { ok: false, status: 503, error: { code: "unavailable", message: GENERIC_MESSAGES.misconfigured } };
    }
    await clearSession();
    return signedOut;
  }
  return result;
}

export type FailureCopy = Partial<Record<BackendError["code"], string>>;

export function actionFailure(
  context: string,
  result: { status: number; error: BackendError },
  copy: FailureCopy = {},
  fields?: Record<string, string[]>,
): ActionFailure {
  const { error } = result;
  const httpStatus = errorStatus(error, result.status);
  const failure: ActionFailure = {
    status: "error",
    httpStatus,
    code: error.code,
    message: copy[error.code] ?? publicMessage(error),
  };
  if (fields && Object.keys(fields).length > 0) failure.fields = fields;
  if (error.retryAfterSeconds !== undefined) failure.retryAfterSeconds = error.retryAfterSeconds;
  if (!copy[error.code] && error.code !== "validation" && error.code !== "unauthorized" && error.code !== "account_blocked") {
    logBackendError(context, error, result.status);
  }
  return failure;
}

export function unexpectedResponse(context: string): ActionFailure {
  console.error(`[${context}] backend returned an unexpected response`);
  return { status: "error", httpStatus: 502, code: "internal", message: GENERIC_MESSAGES.fallback };
}
