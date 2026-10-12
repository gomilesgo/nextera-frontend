import type { BackendError, BackendResult } from "@/lib/backend/client";
import { isUserSafe, logBackendError, publicMessage } from "@/lib/safeErrors";
import type { ApiErrorBody } from "./errors";

const NO_STORE = { "cache-control": "no-store" };

export function noStoreJson(body: unknown, status = 200, init: { headers?: HeadersInit } = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("cache-control", NO_STORE["cache-control"]);
  return Response.json(body, { status, headers });
}

export function errorStatus(error: BackendError, upstreamStatus: number): number {
  if (error.code === "unavailable") return 503;
  if (upstreamStatus >= 400 && upstreamStatus <= 599) return upstreamStatus;
  return 502;
}

export function errorResponse(error: BackendError, status: number): Response {
  if (!isUserSafe(error.code) && error.code !== "unauthorized") logBackendError("api", error, status);
  const body: ApiErrorBody = { error: { code: error.code, message: publicMessage(error) } };
  if (error.fields && error.code === "validation") body.error.fields = error.fields;
  const headers: HeadersInit = {};
  if (error.retryAfterSeconds !== undefined) {
    body.error.retryAfterSeconds = error.retryAfterSeconds;
    headers["retry-after"] = String(error.retryAfterSeconds);
  }
  return noStoreJson(body, status, { headers });
}

export const unauthorizedError: BackendError = {
  code: "unauthorized",
  message: "Your session has expired. Please sign in again.",
};

export function fromBackend<T, R>(result: BackendResult<T>, select: (data: T) => R | null): Response {
  if (!result.ok) return errorResponse(result.error, errorStatus(result.error, result.status));
  const selected = select(result.data);
  if (selected === null) {
    return errorResponse({ code: "internal", message: "The server returned an unexpected response" }, 502);
  }
  return noStoreJson(selected);
}
