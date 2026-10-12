"use server";

import type { AdminTicketMessageResponse, AdminTicketSummary } from "@nextera/contracts";
import type { ActionOutcome } from "@/lib/actions/outcome";
import { CHECK_FIELDS, backendFailure, unexpectedResponse } from "@/lib/actions/server";
import { authorizeAction, staffRequest } from "@/lib/session";
import { isRecord, isUuid } from "@/lib/shape";
import { buildReplyForm, buildTicketUpdate, checkAttachmentBytes, readReplyForm } from "@/lib/support/reply";
import type { TicketPatchInput } from "@/lib/support/reply";
import { isAdminTicketMessageResponse, isAdminTicketResponse } from "@/lib/support/shape";

export type TicketReplyResult = ActionOutcome<AdminTicketMessageResponse>;
export type TicketResult = ActionOutcome<AdminTicketSummary>;

const missing = { status: "error", code: "not_found", message: "Ticket not found" } as const;

export async function replyToTicket(ticketId: string, formData: FormData): Promise<TicketReplyResult> {
  const auth = await authorizeAction("support.write");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };
  if (!isUuid(ticketId)) return missing;
  if (!(formData instanceof FormData)) return { status: "error", code: "validation", message: CHECK_FIELDS };

  const parsed = readReplyForm(formData);
  if (!parsed.ok) return { status: "error", code: "validation", message: CHECK_FIELDS, errors: parsed.errors };
  const { input, attachment } = parsed.value;

  let request: { json: unknown } | { form: FormData } = { json: input };
  if (attachment) {
    const checked = await checkAttachmentBytes(attachment);
    if (!checked.ok) return { status: "error", code: "validation", message: CHECK_FIELDS, errors: checked.errors };
    request = { form: buildReplyForm(input, checked.value) };
  }

  const result = await staffRequest<unknown>(auth.token, `/v1/admin/support/tickets/${ticketId}/messages`, {
    method: "POST",
    ...request,
  });
  if (!result.ok) return backendFailure(result.error);
  return isAdminTicketMessageResponse(result.data) ? { status: "ok", data: result.data } : unexpectedResponse("reply");
}

export async function updateTicket(ticketId: string, patch: TicketPatchInput): Promise<TicketResult> {
  const auth = await authorizeAction("support.write");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };
  if (!isUuid(ticketId)) return missing;
  if (!isRecord(patch)) return { status: "error", code: "validation", message: CHECK_FIELDS };

  const built = buildTicketUpdate({ status: patch.status, priority: patch.priority, assigneeId: patch.assigneeId });
  if (!built.ok) return { status: "error", code: "validation", message: CHECK_FIELDS, errors: built.errors };

  const result = await staffRequest<unknown>(auth.token, `/v1/admin/support/tickets/${ticketId}`, {
    method: "PATCH",
    json: built.value,
  });
  if (!result.ok) return backendFailure(result.error);
  return isAdminTicketResponse(result.data) ? { status: "ok", data: result.data.ticket } : unexpectedResponse("ticket");
}

export async function closeTicket(ticketId: string): Promise<TicketResult> {
  const auth = await authorizeAction("support.write");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };
  if (!isUuid(ticketId)) return missing;

  const result = await staffRequest<unknown>(auth.token, `/v1/admin/support/tickets/${ticketId}/close`, { method: "POST" });
  if (!result.ok) return backendFailure(result.error);
  return isAdminTicketResponse(result.data) ? { status: "ok", data: result.data.ticket } : unexpectedResponse("ticket");
}
