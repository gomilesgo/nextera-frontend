import { ApiError } from "@/lib/api/errors";
import type { SupportResult } from "./mutations";
import type { TicketFormErrors, TicketFormField } from "./validation";

export const SEND_FAILED = "We could not send that just now. Check your connection and try again.";

export async function unwrap<T>(pending: Promise<SupportResult<T>>): Promise<T> {
  const result = await pending;
  if (result.ok) return result.data;
  throw new ApiError(result.status, result.code, result.message, {
    fields: result.fields,
    retryAfterSeconds: result.retryAfterSeconds,
  });
}

const fields: readonly TicketFormField[] = ["subject", "category", "body", "attachment"];

export function fieldErrorsFrom(error: unknown): TicketFormErrors {
  if (!(error instanceof ApiError) || !error.fields) return {};
  const errors: TicketFormErrors = {};
  for (const field of fields) {
    const message = error.fields[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}

export type MutationNotice = { title: string; body: string } | null;

export function mutationNotice(error: unknown): MutationNotice {
  if (!error) return null;
  if (!(error instanceof ApiError)) return { title: "Not sent", body: SEND_FAILED };
  if (error.status === 401 || (error.status === 403 && error.code === "account_blocked")) return null;
  if (error.code === "rate_limited") return { title: "Limit reached", body: error.message };
  if (error.code === "validation" && Object.keys(fieldErrorsFrom(error)).length > 0) {
    return { title: "Please check the highlighted fields", body: error.message };
  }
  return { title: "Not sent", body: error.message || SEND_FAILED };
}
