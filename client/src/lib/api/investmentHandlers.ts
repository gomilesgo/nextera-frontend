import type { InvestmentDetail } from "@nextera/contracts";
import type { BackendBinary, BackendError, BackendResult } from "@/lib/backend/client";
import { mapLimited, summarise, summaryTargets } from "@/lib/investmentSummary";
import type { InvestmentSummary } from "@/lib/investmentSummary";
import {
  STATEMENT_CURSOR,
  isUuid,
  toDocumentList,
  toInvestmentDetail,
  toInvestmentList,
  toPaymentStatus,
  toStatementPage,
} from "@/lib/investments";
import { GENERIC_MESSAGES, logServiceKeyRejected, serviceKeyRejected } from "@/lib/safeErrors";
import { toPortalStatementPage } from "@/lib/statements";
import { clearSessionCookieHeader } from "./handlers";
import type { HandlerDeps } from "./handlers";
import { errorResponse, errorStatus, fromBackend, unauthorizedError } from "./respond";

export const STATEMENT_PAGE_SIZE = 25;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

function signedOut(): Response {
  const response = errorResponse(unauthorizedError, 401);
  response.headers.append("set-cookie", clearSessionCookieHeader());
  return response;
}

function notFound(message: string): Response {
  return errorResponse({ code: "not_found", message }, 404);
}

const malformed: BackendError = { code: "internal", message: "The server returned an unexpected response" };

type Outcome = { ok: true } | { ok: false; error: { code: string } };

async function guard(deps: Pick<HandlerDeps, "call">, result: Outcome, context: string): Promise<Response | null> {
  if (result.ok || result.error.code !== "unauthorized") return null;
  if (await serviceKeyRejected((path) => deps.call(path))) {
    logServiceKeyRejected(context);
    return errorResponse({ code: "unavailable", message: GENERIC_MESSAGES.misconfigured }, 503);
  }
  return signedOut();
}

async function respond<T, R>(
  deps: HandlerDeps,
  result: BackendResult<T>,
  context: string,
  select: (data: T) => R | null,
): Promise<Response> {
  return (await guard(deps, result, context)) ?? fromBackend(result, select);
}

export async function investmentsHandler(deps: HandlerDeps): Promise<Response> {
  if (!deps.token) return signedOut();
  const result = await deps.call<unknown>("/v1/investments", { token: deps.token });
  return respond(deps, result, "api/investments", (data) => {
    const investments = toInvestmentList(data);
    return investments ? { investments } : null;
  });
}

export async function investmentHandler(deps: HandlerDeps, id: string): Promise<Response> {
  if (!deps.token) return signedOut();
  if (!isUuid(id)) return notFound("Investment not found");
  const result = await deps.call<unknown>(`/v1/investments/${id}`, { token: deps.token });
  return respond(deps, result, "api/investments/:id", toInvestmentDetail);
}

export async function paymentStatusHandler(deps: HandlerDeps, id: string): Promise<Response> {
  if (!deps.token) return signedOut();
  if (!isUuid(id)) return notFound("Investment not found");
  const result = await deps.call<unknown>(`/v1/investments/${id}/payment`, { token: deps.token });
  return respond(deps, result, "api/investments/:id/payment", toPaymentStatus);
}

export type SummaryOutcome = { ok: true; summary: InvestmentSummary } | { ok: false; result: BackendResult<never> };

export async function buildSummary(call: HandlerDeps["call"], token: string): Promise<SummaryOutcome> {
  const list = await call<unknown>("/v1/investments", { token });
  if (!list.ok) return { ok: false, result: list };
  const investments = toInvestmentList(list.data);
  if (!investments) return { ok: false, result: { ok: false, status: 502, error: malformed } };
  const results = await mapLimited(summaryTargets(investments), 4, (item) =>
    call<unknown>(`/v1/investments/${item.id}`, { token }),
  );
  const lost = results.find((result) => !result.ok && result.error.code === "unauthorized");
  if (lost && !lost.ok) return { ok: false, result: lost };
  const details = results
    .map((result) => (result.ok ? toInvestmentDetail(result.data) : null))
    .filter((detail): detail is InvestmentDetail => detail !== null);
  return { ok: true, summary: summarise(investments, details) };
}

export async function investmentSummaryHandler(deps: HandlerDeps): Promise<Response> {
  if (!deps.token) return signedOut();
  const outcome = await buildSummary(deps.call, deps.token);
  if (outcome.ok) return fromBackend({ ok: true, status: 200, data: null }, () => ({ summary: outcome.summary }));
  return (await guard(deps, outcome.result, "api/investments/summary")) ?? fromBackend(outcome.result, () => null);
}

export async function documentsHandler(deps: HandlerDeps): Promise<Response> {
  if (!deps.token) return signedOut();
  const result = await deps.call<unknown>("/v1/documents", { token: deps.token });
  return respond(deps, result, "api/documents", (data) => {
    const documents = toDocumentList(data);
    return documents ? { documents } : null;
  });
}

export function statementPath(cursor: string | null): string | null {
  const params = new URLSearchParams({ limit: String(STATEMENT_PAGE_SIZE) });
  if (cursor !== null && cursor !== "") {
    if (!STATEMENT_CURSOR.test(cursor)) return null;
    params.set("cursor", cursor);
  }
  return `/v1/statements?${params.toString()}`;
}

export async function statementsHandler(deps: HandlerDeps, cursor: string | null): Promise<Response> {
  if (!deps.token) return signedOut();
  const path = statementPath(cursor);
  if (!path) {
    return errorResponse({ code: "validation", message: "Invalid cursor", fields: { cursor: ["Invalid cursor"] } }, 400);
  }
  const result = await deps.call<unknown>(path, { token: deps.token });
  return respond(deps, result, "api/statements", (data) => {
    const page = toStatementPage(data);
    return page ? toPortalStatementPage(page) : null;
  });
}

export type PdfDisposition = "inline" | "attachment";

export function dispositionFrom(url: URL): PdfDisposition {
  return url.searchParams.get("download") === "1" ? "attachment" : "inline";
}

const FILE_NAME = /filename="([A-Za-z0-9._-]{1,120})"/;

export function fileNameFrom(disposition: string | null): string | null {
  const match = disposition ? FILE_NAME.exec(disposition) : null;
  return match?.[1] ?? null;
}

export function safePdfName(name: string | null, fallback: string): string {
  const cleaned = (name ?? "").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
  return cleaned && cleaned.toLowerCase().endsWith(".pdf") ? cleaned : fallback;
}

export function pdfHeaders(input: { fileName: string; disposition: PdfDisposition; length: number }): Headers {
  return new Headers({
    "content-type": "application/pdf",
    "content-disposition": `${input.disposition}; filename="${input.fileName}"`,
    "content-length": String(input.length),
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "content-security-policy": "frame-ancestors 'self'",
    "referrer-policy": "no-referrer",
  });
}

async function sendPdf(
  deps: HandlerDeps,
  path: string,
  fallbackName: string,
  disposition: PdfDisposition,
  context: string,
): Promise<Response> {
  if (!deps.token) return signedOut();
  const result = await deps.call<BackendBinary>(path, { token: deps.token, binary: true, maxBytes: MAX_PDF_BYTES });
  if (!result.ok) {
    return (await guard(deps, result, context)) ?? errorResponse(result.error, errorStatus(result.error, result.status));
  }
  const type = result.data.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (type !== "application/pdf") return errorResponse({ code: "internal", message: "The server returned an unexpected file" }, 502);
  const fileName = safePdfName(fileNameFrom(result.data.headers.get("content-disposition")), fallbackName);
  return new Response(result.data.bytes, {
    status: 200,
    headers: pdfHeaders({ fileName, disposition, length: result.data.bytes.byteLength }),
  });
}

export type InvestmentFileKind = "agreement" | "bond";

export async function investmentFileHandler(
  deps: HandlerDeps,
  id: string,
  kind: InvestmentFileKind,
  disposition: PdfDisposition,
): Promise<Response> {
  if (!deps.token) return signedOut();
  if (!isUuid(id)) return notFound("Document not found");
  return sendPdf(deps, `/v1/investments/${id}/${kind}`, `nextera-${kind}-${id.slice(0, 8)}.pdf`, disposition, `api/investments/:id/${kind}`);
}

export async function documentFileHandler(deps: HandlerDeps, id: string, disposition: PdfDisposition): Promise<Response> {
  if (!deps.token) return signedOut();
  if (!isUuid(id)) return notFound("Document not found");
  return sendPdf(deps, `/v1/documents/${id}/file`, `nextera-document-${id.slice(0, 8)}.pdf`, disposition, "api/documents/:id/file");
}
