import { TICKET_ATTACHMENT_MAX_BYTES, TICKET_ATTACHMENT_TYPES, TICKET_LIMITS } from "@nextera/contracts";
import type { TicketAttachmentType } from "@nextera/contracts";

export const ATTACHMENT_ACCEPT = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ...TICKET_ATTACHMENT_TYPES].join(",");

export const ATTACHMENT_HINT = `PDF, JPEG, PNG or WebP, up to ${TICKET_ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB`;

export const ATTACHMENT_TYPE_ERROR = "Attach a PDF, JPEG, PNG or WebP file";
export const ATTACHMENT_SIZE_ERROR = `Attach a file of at most ${TICKET_ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB`;
export const ATTACHMENT_EMPTY_ERROR = "The attached file is empty";

const byExtension: Record<string, TicketAttachmentType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const extensionFor: Record<TicketAttachmentType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type FileLike = { name: string; size: number; type: string };

export function isAttachmentType(value: string): value is TicketAttachmentType {
  return (TICKET_ATTACHMENT_TYPES as readonly string[]).includes(value);
}

export function declaredType(file: FileLike): TicketAttachmentType | null {
  const declared = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (isAttachmentType(declared)) return declared;
  if (declared && declared !== "application/octet-stream") return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return byExtension[extension] ?? null;
}

export function isEmptyFileInput(file: FileLike): boolean {
  return file.size === 0 && file.name === "";
}

export function attachmentError(file: FileLike): string | null {
  if (file.size === 0) return ATTACHMENT_EMPTY_ERROR;
  if (file.size > TICKET_ATTACHMENT_MAX_BYTES) return ATTACHMENT_SIZE_ERROR;
  if (!declaredType(file)) return ATTACHMENT_TYPE_ERROR;
  return null;
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

export function safeFileName(raw: string, type: TicketAttachmentType | null): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+/, "")
    .trim()
    .slice(0, TICKET_LIMITS.attachmentName);
  return cleaned || `attachment.${type ? extensionFor[type] : "bin"}`;
}
