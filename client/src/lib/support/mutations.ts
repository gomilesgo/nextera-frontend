import type { TicketDetailResponse, TicketMessageResponse, TicketResponse } from "@nextera/contracts";
import type { BackendRequest, BackendResult } from "@/lib/backend/client";
import { GENERIC_MESSAGES, logBackendError, logServiceKeyRejected, serviceKeyRejected } from "@/lib/safeErrors";
import { failure, invalidFailure, supportFailure, SUPPORT_MESSAGES } from "./errors";
import type { SupportContext, SupportFailure } from "./errors";
import { toTicketDetail, toTicketMessageResponse, toTicketResponse } from "./parse";
import { SUPPORT_TICKETS_PATH, messageBody, ticketClosePath, ticketMessagesPath } from "./requests";
import { isTicketId, validateReplyForm, validateTicketForm, withVerifiedAttachment } from "./validation";

export type SupportResult<T> = { ok: true; data: T } | SupportFailure;

export type MutationDeps = {
  token: string | null;
  call: <T>(path: string, init?: Omit<BackendRequest, "ip" | "userAgent" | "revalidateSeconds">) => Promise<BackendResult<T>>;
  clearSession: () => Promise<void>;
};

const signedOut = (): SupportFailure => failure(401, "unauthorized", GENERIC_MESSAGES.unauthorized);

async function settle<T>(
  deps: MutationDeps,
  result: BackendResult<unknown>,
  context: SupportContext,
  parse: (data: unknown) => T | null,
): Promise<SupportResult<T>> {
  if (result.ok) {
    const data = parse(result.data);
    if (data) return { ok: true, data };
    logBackendError(`support:${context}`, { code: "internal" }, result.status);
    return failure(502, "internal", GENERIC_MESSAGES.fallback);
  }
  if (result.error.code === "unauthorized") {
    if (await serviceKeyRejected((path) => deps.call(path))) {
      logServiceKeyRejected(`support:${context}`);
      return failure(503, "unavailable", GENERIC_MESSAGES.misconfigured);
    }
    await deps.clearSession();
  }
  return supportFailure(result.error, result.status, context);
}

function body(fields: Record<string, string>, attachment: File | null) {
  const built = messageBody(fields, attachment);
  return "form" in built ? { form: built.form } : { json: built.json };
}

export async function createTicket(deps: MutationDeps, formData: FormData): Promise<SupportResult<TicketDetailResponse>> {
  const validated = await withVerifiedAttachment(validateTicketForm(formData));
  if (!validated.ok) return invalidFailure(validated.errors);
  if (!deps.token) return signedOut();
  const result = await deps.call<unknown>(SUPPORT_TICKETS_PATH, {
    method: "POST",
    token: deps.token,
    ...body(validated.input, validated.attachment),
  });
  return settle(deps, result, "create", toTicketDetail);
}

export async function replyToTicket(
  deps: MutationDeps,
  ticketId: unknown,
  formData: FormData,
): Promise<SupportResult<TicketMessageResponse>> {
  if (!isTicketId(ticketId)) return failure(404, "not_found", SUPPORT_MESSAGES.notFound);
  const validated = await withVerifiedAttachment(validateReplyForm(formData));
  if (!validated.ok) return invalidFailure(validated.errors);
  if (!deps.token) return signedOut();
  const result = await deps.call<unknown>(ticketMessagesPath(ticketId), {
    method: "POST",
    token: deps.token,
    ...body(validated.input, validated.attachment),
  });
  return settle(deps, result, "reply", toTicketMessageResponse);
}

export async function closeTicket(deps: MutationDeps, ticketId: unknown): Promise<SupportResult<TicketResponse>> {
  if (!isTicketId(ticketId)) return failure(404, "not_found", SUPPORT_MESSAGES.notFound);
  if (!deps.token) return signedOut();
  const result = await deps.call<unknown>(ticketClosePath(ticketId), { method: "POST", token: deps.token, json: {} });
  return settle(deps, result, "close", toTicketResponse);
}
