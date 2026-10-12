import type { BackendError, BackendResult } from "@/lib/backend/client";

export const USER_SAFE_CODES: ReadonlySet<string> = new Set([
  "otp_invalid",
  "otp_expired",
  "otp_exhausted",
  "validation",
  "rate_limited",
  "account_blocked",
  "not_found",
]);

export const GENERIC_MESSAGES = {
  unauthorized: "Your session has expired. Please sign in again.",
  unavailable: "We could not reach Nextera just now. Please try again in a moment.",
  misconfigured: "Nextera is temporarily unavailable. Please try again shortly.",
  fallback: "Something went wrong on our side. Please try again.",
} as const;

export function isUserSafe(code: string): boolean {
  return USER_SAFE_CODES.has(code);
}

export function publicMessage(error: Pick<BackendError, "code" | "message">): string {
  if (isUserSafe(error.code)) return error.message;
  if (error.code === "unauthorized") return GENERIC_MESSAGES.unauthorized;
  if (error.code === "unavailable") return GENERIC_MESSAGES.unavailable;
  return GENERIC_MESSAGES.fallback;
}

export function logBackendError(context: string, error: Pick<BackendError, "code">, status?: number): void {
  console.error(`[${context}] backend error`, status === undefined ? error.code : `${status}:${error.code}`);
}

export function logServiceKeyRejected(context: string): void {
  console.error(
    `[${context}] the backend rejected NEXTERA_PORTAL_SERVICE_KEY; check the client and backend configuration`,
  );
}

export type PingCall = (path: string) => Promise<BackendResult<unknown>>;

export async function serviceKeyRejected(call: PingCall): Promise<boolean> {
  const ping = await call("/v1/ping");
  return !ping.ok && ping.error.code === "unauthorized";
}
