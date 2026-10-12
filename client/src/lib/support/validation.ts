import {
  TICKET_ATTACHMENT_FIELD,
  TICKET_ATTACHMENT_MAX_BYTES,
  TICKET_ATTACHMENT_TYPES,
  TICKET_LIMITS,
  ticketCategories,
} from "@nextera/contracts";
import type { TicketAttachmentType, TicketCategory, TicketCreate, TicketReply } from "@nextera/contracts";
import { z } from "zod";

export function megabyteLabel(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return `${Number.isInteger(megabytes) ? megabytes : Number(megabytes.toFixed(1))} MB`;
}

export const SUPPORT_ATTACHMENT_MAX_LABEL = megabyteLabel(TICKET_ATTACHMENT_MAX_BYTES);
export const SUPPORT_ATTACHMENT_FIELD = TICKET_ATTACHMENT_FIELD;

const extensionTypes: Record<string, TicketAttachmentType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const SUPPORT_ATTACHMENT_ACCEPT = [
  ...TICKET_ATTACHMENT_TYPES,
  ...Object.keys(extensionTypes).map((extension) => `.${extension}`),
].join(",");

export const ATTACHMENT_MESSAGES = {
  empty: "The selected file is empty. Choose another file.",
  tooLarge: `Attach a file of at most ${SUPPORT_ATTACHMENT_MAX_LABEL}.`,
  type: "Attach a PDF, JPEG, PNG or WebP file.",
  unreadable: "We could not read that file. Choose another file.",
} as const;

export type TicketFormField = "subject" | "category" | "body" | "attachment";
export type TicketFormErrors = Partial<Record<TicketFormField, string>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTicketId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function declaredType(file: Pick<File, "type">): string {
  return file.type.split(";")[0]?.trim().toLowerCase() ?? "";
}

function extensionType(name: string): TicketAttachmentType | null {
  const extension = /\.([A-Za-z0-9]+)$/.exec(name)?.[1]?.toLowerCase();
  return extension ? (extensionTypes[extension] ?? null) : null;
}

function isKnownType(value: string): value is TicketAttachmentType {
  return (TICKET_ATTACHMENT_TYPES as readonly string[]).includes(value);
}

export function attachmentFrom(formData: FormData): File | null {
  const value = formData.get(SUPPORT_ATTACHMENT_FIELD);
  if (!value || typeof value === "string") return null;
  if (value.size === 0 && (value.name === "" || value.name === "blob")) return null;
  return value;
}

export function checkAttachment(file: Pick<File, "name" | "size" | "type">): string | null {
  if (file.size === 0) return ATTACHMENT_MESSAGES.empty;
  if (file.size > TICKET_ATTACHMENT_MAX_BYTES) return ATTACHMENT_MESSAGES.tooLarge;
  const declared = declaredType(file);
  if (isKnownType(declared)) return null;
  if ((declared === "" || declared === "application/octet-stream") && extensionType(file.name)) return null;
  return ATTACHMENT_MESSAGES.type;
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

export function sniffAttachmentType(bytes: Uint8Array): TicketAttachmentType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export async function verifyAttachment(file: File): Promise<string | null> {
  const basic = checkAttachment(file);
  if (basic) return basic;
  let head: Uint8Array;
  try {
    head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  } catch {
    return ATTACHMENT_MESSAGES.unreadable;
  }
  const sniffed = sniffAttachmentType(head);
  if (!sniffed) return ATTACHMENT_MESSAGES.type;
  const declared = declaredType(file);
  if (isKnownType(declared) && declared !== sniffed) return ATTACHMENT_MESSAGES.type;
  return null;
}

const subjectSchema = z
  .string()
  .trim()
  .min(1, "Enter a subject.")
  .min(3, "Use at least 3 characters for the subject.")
  .max(TICKET_LIMITS.subject, `Keep the subject under ${TICKET_LIMITS.subject} characters.`);

const bodySchema = z
  .string()
  .trim()
  .min(1, "Write a message.")
  .max(TICKET_LIMITS.body, `Keep your message under ${TICKET_LIMITS.body.toLocaleString("en-IN")} characters.`);

const createSchema = z.object({
  subject: subjectSchema,
  category: z.string().refine((value) => (ticketCategories as readonly string[]).includes(value), "Choose a topic."),
  body: bodySchema,
});

const replySchema = z.object({ body: bodySchema });

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function issuesToErrors(issues: z.ZodIssue[]): TicketFormErrors {
  const errors: TicketFormErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (key === "subject" || key === "category" || key === "body") errors[key] ??= issue.message;
  }
  return errors;
}

export type Validated<T> =
  | { ok: true; input: T; attachment: File | null }
  | { ok: false; errors: TicketFormErrors };

function finish<T>(
  parsed: { success: true; data: T } | { success: false; error: z.ZodError },
  attachment: File | null,
  attachmentError: string | null,
): Validated<T> {
  const errors: TicketFormErrors = parsed.success ? {} : issuesToErrors(parsed.error.issues);
  if (attachmentError) errors.attachment = attachmentError;
  if (!parsed.success || attachmentError) return { ok: false, errors };
  return { ok: true, input: parsed.data, attachment };
}

export function validateTicketForm(formData: FormData): Validated<TicketCreate> {
  const attachment = attachmentFrom(formData);
  const parsed = createSchema.safeParse({
    subject: text(formData, "subject"),
    category: text(formData, "category"),
    body: text(formData, "body"),
  });
  const result = parsed.success
    ? { success: true as const, data: { ...parsed.data, category: parsed.data.category as TicketCategory } }
    : { success: false as const, error: parsed.error };
  return finish(result, attachment, attachment ? checkAttachment(attachment) : null);
}

export function validateReplyForm(formData: FormData): Validated<TicketReply> {
  const attachment = attachmentFrom(formData);
  const parsed = replySchema.safeParse({ body: text(formData, "body") });
  return finish(parsed, attachment, attachment ? checkAttachment(attachment) : null);
}

export async function withVerifiedAttachment<T>(validated: Validated<T>): Promise<Validated<T>> {
  if (!validated.ok || !validated.attachment) return validated;
  const problem = await verifyAttachment(validated.attachment);
  return problem ? { ok: false, errors: { attachment: problem } } : validated;
}
