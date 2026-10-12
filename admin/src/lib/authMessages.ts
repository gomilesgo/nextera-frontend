import type { BackendError } from "@/lib/backend/client";

export function formatWait(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return "a few minutes";
  if (seconds < 60) {
    const whole = Math.ceil(seconds);
    return `${whole} second${whole === 1 ? "" : "s"}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function loginErrorMessage(error: BackendError): string {
  switch (error.code) {
    case "account_locked":
      return `Too many failed attempts. This account is locked. Try again in ${formatWait(error.retryAfterSeconds)}.`;
    case "rate_limited":
      return `Too many sign-in attempts from this connection. Try again in ${formatWait(error.retryAfterSeconds)}.`;
    case "unauthorized":
      return "Email, password or code is incorrect.";
    case "validation":
      return "Please check the highlighted fields.";
    case "unavailable":
      return error.message;
    default:
      return "Sign-in failed. Please try again.";
  }
}
