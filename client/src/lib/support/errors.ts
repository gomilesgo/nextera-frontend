import type { BackendError } from "@/lib/backend/client";
import { retryAfterPhrase } from "@/lib/retryAfter";
import { GENERIC_MESSAGES, logBackendError } from "@/lib/safeErrors";
import { ATTACHMENT_MESSAGES } from "./validation";
import type { TicketFormField } from "./validation";

export type SupportFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  retryAfterSeconds?: number;
};

export type SupportContext = "create" | "reply" | "close";

const formFields: readonly TicketFormField[] = ["subject", "category", "body", "attachment"];

export const SUPPORT_MESSAGES = {
  invalid: "Please check the highlighted fields.",
  closedReply: "This request is closed, so it cannot take new replies. Start a new request if you still need help.",
  alreadyClosed: "This request is already closed.",
  notFound: "We could not find this request. The link may be out of date.",
  rateLimited: "You have reached today's limit for support requests.",
  tooLarge: "Your attachment is too large to send.",
} as const;

export function failure(
  status: number,
  code: string,
  message: string,
  extra: Pick<SupportFailure, "fields" | "retryAfterSeconds"> = {},
): SupportFailure {
  const result: SupportFailure = { ok: false, status, code, message };
  if (extra.fields && Object.keys(extra.fields).length > 0) result.fields = extra.fields;
  if (extra.retryAfterSeconds !== undefined) result.retryAfterSeconds = extra.retryAfterSeconds;
  return result;
}

export function invalidFailure(errors: Partial<Record<TicketFormField, string>>): SupportFailure {
  const fields: Record<string, string[]> = {};
  for (const [key, message] of Object.entries(errors)) if (message) fields[key] = [message];
  return failure(400, "validation", SUPPORT_MESSAGES.invalid, { fields });
}

export function rateLimitMessage(message: string | undefined, retryAfterSeconds: number | undefined): string {
  const base = message?.trim() || SUPPORT_MESSAGES.rateLimited;
  const phrase = retryAfterPhrase(retryAfterSeconds);
  return phrase ? `${base} You can try again in ${phrase}.` : base;
}

function formFieldErrors(fields: Record<string, string[]> | undefined): Record<string, string[]> {
  const picked: Record<string, string[]> = {};
  for (const field of formFields) {
    const message = fields?.[field]?.[0];
    if (message) picked[field] = [message];
  }
  return picked;
}

export function supportFailure(error: BackendError, status: number, context: SupportContext): SupportFailure {
  if (error.code === "rate_limited") {
    return failure(429, "rate_limited", rateLimitMessage(error.message, error.retryAfterSeconds), {
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }
  if (status === 413) {
    return failure(413, "validation", SUPPORT_MESSAGES.tooLarge, { fields: { attachment: [ATTACHMENT_MESSAGES.tooLarge] } });
  }
  if (error.code === "validation" && status !== 411) {
    const fields = formFieldErrors(error.fields);
    if (Object.keys(fields).length > 0) return failure(400, "validation", SUPPORT_MESSAGES.invalid, { fields });
    logBackendError(`support:${context}`, error, status);
    return failure(400, "validation", GENERIC_MESSAGES.fallback);
  }
  if (error.code === "conflict") {
    return failure(409, "conflict", context === "close" ? SUPPORT_MESSAGES.alreadyClosed : SUPPORT_MESSAGES.closedReply);
  }
  if (error.code === "not_found") return failure(404, "not_found", SUPPORT_MESSAGES.notFound);
  if (error.code === "unauthorized") return failure(401, "unauthorized", GENERIC_MESSAGES.unauthorized);
  if (error.code === "account_blocked") return failure(403, "account_blocked", error.message);
  if (error.code === "unavailable") return failure(503, "unavailable", GENERIC_MESSAGES.unavailable);
  logBackendError(`support:${context}`, error, status);
  return failure(status >= 400 && status <= 599 ? status : 500, error.code, GENERIC_MESSAGES.fallback);
}
