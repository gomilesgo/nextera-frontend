import "server-only";
import type { BackendError } from "@/lib/backend/client";
import { CHECK_FIELDS } from "./outcome";
import type { ActionOutcome } from "./outcome";

export { CHECK_FIELDS };

export function backendFailure(error: BackendError, map: Record<string, string> = {}): ActionOutcome<never> {
  const errors: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(error.fields ?? {})) {
    (errors[map[key] ?? key] ??= []).push(...messages);
  }
  const hasFields = Object.keys(errors).length > 0;
  return {
    status: "error",
    code: error.code,
    message: error.code === "validation" && hasFields ? CHECK_FIELDS : error.message,
    ...(hasFields ? { errors } : {}),
  };
}

export function unexpectedResponse(what: string): ActionOutcome<never> {
  return { status: "error", code: "internal", message: `The server returned an unexpected ${what}` };
}
