import { isAttachmentType, safeFileName } from "./attachment";

function filenameFrom(disposition: string | null): string {
  if (!disposition) return "";
  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition)?.[1];
  if (extended) {
    try {
      return decodeURIComponent(extended.trim());
    } catch {
      return "";
    }
  }
  return /filename\s*=\s*"?([^";]*)"?/i.exec(disposition)?.[1]?.trim() ?? "";
}

export function attachmentHeaders(upstream: Headers): Headers {
  const declared = upstream.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  const type = isAttachmentType(declared) ? declared : null;
  const name = safeFileName(filenameFrom(upstream.get("content-disposition")), type);
  const headers = new Headers({
    "content-type": type ?? "application/octet-stream",
    "content-disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
  });
  const length = upstream.get("content-length");
  const encoding = upstream.get("content-encoding");
  if (!encoding && length && /^\d+$/.test(length)) headers.set("content-length", length);
  return headers;
}
