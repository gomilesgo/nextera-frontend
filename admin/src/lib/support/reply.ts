import { TICKET_ATTACHMENT_FIELD, adminTicketUpdateSchema, staffTicketReplySchema } from "@nextera/contracts";
import type { AdminTicketUpdate, StaffTicketReply, TicketAttachmentType } from "@nextera/contracts";
import { issuesToFields } from "@/lib/actions/outcome";
import type { FieldErrors } from "@/lib/actions/outcome";
import {
  ATTACHMENT_TYPE_ERROR,
  attachmentError,
  declaredType,
  isEmptyFileInput,
  safeFileName,
  sniffAttachmentType,
} from "./attachment";

export type ReplyFields = { input: StaffTicketReply; attachment: Blob | null };

export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function fileName(value: Blob): string {
  return "name" in value && typeof value.name === "string" ? value.name : "";
}

export function readReplyForm(formData: FormData): Parsed<ReplyFields> {
  const errors: FieldErrors = {};
  const body = formData.get("body");
  const internal = formData.get("internal");
  const status = formData.get("status");
  const attachment = formData.get(TICKET_ATTACHMENT_FIELD);

  if (internal !== "true" && internal !== "false") errors.internal = ["Choose reply or internal note"];
  const candidate: Record<string, unknown> = {
    body: typeof body === "string" ? body : "",
    internal: internal === "true",
  };
  if (typeof status === "string" && status !== "") candidate.status = status;
  else if (status !== null && status !== "") errors.status = ["Choose a status"];

  const parsed = staffTicketReplySchema.safeParse(candidate);
  if (!parsed.success) Object.assign(errors, issuesToFields(parsed.error.issues));
  if (errors.status) errors.status = ["Choose open, waiting on customer or resolved"];

  let file: Blob | null = null;
  if (attachment !== null && attachment !== "") {
    if (!isBlob(attachment)) {
      errors[TICKET_ATTACHMENT_FIELD] = ["Attach a file"];
    } else if (!isEmptyFileInput({ name: fileName(attachment), size: attachment.size, type: attachment.type })) {
      const problem = attachmentError({ name: fileName(attachment), size: attachment.size, type: attachment.type });
      if (problem) errors[TICKET_ATTACHMENT_FIELD] = [problem];
      else file = attachment;
    }
  }

  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { input: parsed.data, attachment: file } };
}

export type CheckedAttachment = { file: Blob; name: string; type: TicketAttachmentType };

export async function checkAttachmentBytes(file: Blob): Promise<Parsed<CheckedAttachment>> {
  const name = fileName(file);
  const sniffed = sniffAttachmentType(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  const declared = declaredType({ name, size: file.size, type: file.type });
  if (!sniffed || (declared && declared !== sniffed)) {
    return { ok: false, errors: { [TICKET_ATTACHMENT_FIELD]: [ATTACHMENT_TYPE_ERROR] } };
  }
  return { ok: true, value: { file, name: safeFileName(name, sniffed), type: sniffed } };
}

export function buildReplyForm(input: StaffTicketReply, attachment: CheckedAttachment): FormData {
  const form = new FormData();
  form.set("body", input.body);
  form.set("internal", input.internal ? "true" : "false");
  if (input.status) form.set("status", input.status);
  form.set(TICKET_ATTACHMENT_FIELD, new Blob([attachment.file], { type: attachment.type }), attachment.name);
  return form;
}

export type TicketPatchInput = { status?: unknown; priority?: unknown; assigneeId?: unknown };

export function buildTicketUpdate(input: TicketPatchInput): Parsed<AdminTicketUpdate> {
  const candidate: Record<string, unknown> = {};
  if (input.status !== undefined) candidate.status = input.status;
  if (input.priority !== undefined) candidate.priority = input.priority;
  if (input.assigneeId !== undefined) candidate.assigneeId = input.assigneeId;
  const parsed = adminTicketUpdateSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, errors: issuesToFields(parsed.error.issues) };
}
