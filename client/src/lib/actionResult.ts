import { ApiError } from "@/lib/api/errors";

export type ActionFailure = {
  status: "error";
  httpStatus: number;
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  retryAfterSeconds?: number;
};

export const CHECK_FIELDS = "Please check the highlighted fields.";
export const ACTION_UNREACHABLE = "Could not reach Nextera. Check your connection and try again.";

export function fieldArrays(errors: Partial<Record<string, string>>): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const [field, message] of Object.entries(errors)) {
    if (message) fields[field] = [message];
  }
  return fields;
}

export function invalidFields(errors: Partial<Record<string, string>>): ActionFailure {
  return { status: "error", httpStatus: 400, code: "validation", message: CHECK_FIELDS, fields: fieldArrays(errors) };
}

export function unwrapAction<T extends { status: "ok" }>(result: T | ActionFailure): T {
  if (result.status === "error") {
    throw new ApiError(result.httpStatus, result.code, result.message, {
      fields: result.fields,
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
  return result;
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.fields) return {};
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.fields)) {
    const message = messages[0];
    if (message) errors[field] = message;
  }
  return errors;
}

export function mutationMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return error.message;
  return ACTION_UNREACHABLE;
}

export function waitText(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "Please try again later.";
  if (seconds < 90) return `Please try again in ${seconds} seconds.`;
  if (seconds < 3600) return `Please try again in about ${Math.ceil(seconds / 60)} minutes.`;
  const hours = Math.ceil(seconds / 3600);
  return `Please try again in about ${hours} ${hours === 1 ? "hour" : "hours"}.`;
}
