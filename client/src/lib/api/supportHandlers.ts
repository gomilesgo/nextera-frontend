import { TICKET_ATTACHMENT_TYPES, TICKET_LIMITS } from "@nextera/contracts";
import type { BackendBinary, BackendResult } from "@/lib/backend/client";
import { GENERIC_MESSAGES, logServiceKeyRejected, serviceKeyRejected } from "@/lib/safeErrors";
import { toTicketDetail, toTicketList } from "@/lib/support/parse";
import { isCursor, parseStatusFilter, ticketAttachmentPath, ticketListPath, ticketPath } from "@/lib/support/requests";
import { isTicketId } from "@/lib/support/validation";
import { clearSessionCookieHeader } from "./handlers";
import type { HandlerDeps } from "./handlers";
import { errorResponse, errorStatus, fromBackend, unauthorizedError } from "./respond";

const extensions: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function withClearedSession(response: Response): Response {
  if (response.status === 401) response.headers.append("set-cookie", clearSessionCookieHeader());
  return response;
}

function signedOut(): Response {
  return withClearedSession(errorResponse(unauthorizedError, 401));
}

function notFound(message = "Ticket not found"): Response {
  return errorResponse({ code: "not_found", message }, 404);
}

async function misconfigured(deps: HandlerDeps, result: BackendResult<unknown>, context: string): Promise<Response | null> {
  if (result.ok || result.error.code !== "unauthorized") return null;
  if (!(await serviceKeyRejected((path) => deps.call(path)))) return null;
  logServiceKeyRejected(context);
  return errorResponse({ code: "unavailable", message: GENERIC_MESSAGES.misconfigured }, 503);
}

export async function ticketsHandler(deps: HandlerDeps, params: URLSearchParams): Promise<Response> {
  if (!deps.token) return signedOut();
  const rawStatus = params.get("status");
  const status = parseStatusFilter(rawStatus);
  const rawCursor = params.get("cursor");
  const fields: Record<string, string[]> = {};
  if (rawStatus && !status) fields.status = ["Choose a valid status"];
  if (rawCursor && !isCursor(rawCursor)) fields.cursor = ["Invalid cursor"];
  if (Object.keys(fields).length > 0) {
    return errorResponse({ code: "validation", message: "Some fields are invalid", fields }, 400);
  }
  const result = await deps.call<unknown>(ticketListPath(status, rawCursor || null), { token: deps.token });
  return (await misconfigured(deps, result, "api/support/tickets")) ?? withClearedSession(fromBackend(result, toTicketList));
}

export async function ticketHandler(deps: HandlerDeps, id: string): Promise<Response> {
  if (!deps.token) return signedOut();
  if (!isTicketId(id)) return notFound();
  const result = await deps.call<unknown>(ticketPath(id), { token: deps.token });
  return (await misconfigured(deps, result, "api/support/ticket")) ?? withClearedSession(fromBackend(result, toTicketDetail));
}

function sanitizeFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  return base
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+/, "")
    .trim()
    .slice(0, TICKET_LIMITS.attachmentName);
}

function dispositionName(disposition: string | null): string {
  if (!disposition) return "";
  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition)?.[1];
  if (extended) {
    try {
      return decodeURIComponent(extended.trim());
    } catch {
      return "";
    }
  }
  return /filename\s*=\s*"([^"]*)"/i.exec(disposition)?.[1] ?? /filename\s*=\s*([^;]+)/i.exec(disposition)?.[1]?.trim() ?? "";
}

export function attachmentContentType(raw: string | null): string {
  const type = raw?.split(";")[0]?.trim().toLowerCase() ?? "";
  return (TICKET_ATTACHMENT_TYPES as readonly string[]).includes(type) ? type : "application/octet-stream";
}

function originalFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  return base.normalize("NFC").replace(/\p{Cc}/gu, "").trim().slice(0, TICKET_LIMITS.attachmentName);
}

export function attachmentFileNames(disposition: string | null, contentType: string): { ascii: string; original: string } {
  const raw = dispositionName(disposition);
  const ascii = sanitizeFileName(raw) || `attachment.${extensions[contentType] ?? "bin"}`;
  return { ascii, original: originalFileName(raw) || ascii };
}

export function attachmentFileName(disposition: string | null, contentType: string): string {
  return attachmentFileNames(disposition, contentType).ascii;
}

function encodeExtValue(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function contentDisposition(ascii: string, original: string = ascii): string {
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeExtValue(original)}`;
}

export async function attachmentHandler(deps: HandlerDeps, id: string, messageId: string): Promise<Response> {
  if (!deps.token) return signedOut();
  if (!isTicketId(id) || !isTicketId(messageId)) return notFound("Attachment not found");
  const result = await deps.call<BackendBinary>(ticketAttachmentPath(id, messageId), { token: deps.token, binary: true });
  if (!result.ok) {
    const broken = await misconfigured(deps, result, "api/support/attachment");
    return broken ?? withClearedSession(errorResponse(result.error, errorStatus(result.error, result.status)));
  }
  const upstream = result.data;
  const contentType = attachmentContentType(upstream.headers.get("content-type"));
  const names = attachmentFileNames(upstream.headers.get("content-disposition"), contentType);
  const headers = new Headers({
    "content-type": contentType,
    "content-disposition": contentDisposition(names.ascii, names.original),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
    "cross-origin-resource-policy": "same-origin",
  });
  headers.set("content-length", String(upstream.bytes.byteLength));
  return new Response(upstream.bytes, { status: 200, headers });
}
