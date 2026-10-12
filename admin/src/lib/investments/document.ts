import "server-only";
import type { BackendError } from "@/lib/backend/client";
import { downloadFromBackend } from "@/lib/backend/download";
import { isUuid } from "@/lib/shape";

export const PDF_TYPE = "application/pdf";
export const DEFAULT_PDF_NAME = "document.pdf";

export type DocumentFile =
  | { ok: true; body: ReadableStream<Uint8Array> | null; length: string | null; fileName: string }
  | { ok: false; status: number; error: BackendError };

export function safePdfName(disposition: string | null): string {
  const match = disposition ? /filename="?([^";]+)"?/i.exec(disposition) : null;
  const name = match?.[1]?.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^[._]+/, "").slice(0, 120) ?? "";
  if (!name) return DEFAULT_PDF_NAME;
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

function isPdf(contentType: string | null): boolean {
  return contentType?.split(";")[0]?.trim().toLowerCase() === PDF_TYPE;
}

function plainLength(headers: Headers): string | null {
  if (headers.get("content-encoding")) return null;
  const length = headers.get("content-length");
  return length && /^\d+$/.test(length) ? length : null;
}

export function documentPath(investmentId: string, documentId: string): string {
  return `/v1/admin/investments/${investmentId.toLowerCase()}/documents/${documentId.toLowerCase()}/file`;
}

export async function fetchInvestmentDocument(token: string, investmentId: string, documentId: string): Promise<DocumentFile> {
  if (!isUuid(investmentId) || !isUuid(documentId)) {
    return { ok: false, status: 404, error: { code: "not_found", message: "Document not found" } };
  }
  const download = await downloadFromBackend(documentPath(investmentId, documentId), { token, accept: PDF_TYPE });
  if (!download.ok) return download;
  if (!isPdf(download.headers.get("content-type"))) {
    await download.body?.cancel().catch(() => undefined);
    return { ok: false, status: 502, error: { code: "internal", message: "The server returned an unexpected document" } };
  }
  return {
    ok: true,
    body: download.body,
    length: plainLength(download.headers),
    fileName: safePdfName(download.headers.get("content-disposition")),
  };
}

export function pdfInline(file: Extract<DocumentFile, { ok: true }>): Response {
  const responseHeaders: Record<string, string> = {
    "content-type": PDF_TYPE,
    "content-disposition": `inline; filename="${file.fileName}"`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
  if (file.length) responseHeaders["content-length"] = file.length;
  return new Response(file.body, { status: 200, headers: responseHeaders });
}
