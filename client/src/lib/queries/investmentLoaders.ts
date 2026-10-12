import "server-only";
import { buildSummary, statementPath } from "@/lib/api/investmentHandlers";
import type { BackendResult } from "@/lib/backend/client";
import { callBackend } from "@/lib/backend/server";
import { isUuid, toDocumentList, toInvestmentDetail, toInvestmentList, toPaymentStatus, toStatementPage } from "@/lib/investments";
import { toPortalStatementPage } from "@/lib/statements";
import type { DocumentsData } from "./documents";
import type { InvestmentData, InvestmentSummaryData, InvestmentsData, PaymentStatusData } from "./investments";
import { expireOnUnauthorized } from "./loaders";
import type { StatementPage } from "./statements";

async function load<R>(
  path: string,
  token: string,
  context: string,
  parse: (data: unknown) => R | null,
  options: { notFound?: boolean } = {},
): Promise<R | null> {
  const result = await callBackend<unknown>(path, { token });
  await expireOnUnauthorized(result, context);
  if (!result.ok) {
    if (options.notFound && result.error.code === "not_found") return null;
    throw new Error(`${context} unavailable (${result.status}:${result.error.code})`);
  }
  const parsed = parse(result.data);
  if (parsed === null) throw new Error(`${context} response was malformed`);
  return parsed;
}

function required<R>(value: R | null, context: string): R {
  if (value === null) throw new Error(`${context} unavailable`);
  return value;
}

export async function loadInvestments(token: string): Promise<InvestmentsData> {
  const data = await load("/v1/investments", token, "loader.investments", (raw) => {
    const investments = toInvestmentList(raw);
    return investments ? { investments } : null;
  });
  return required(data, "loader.investments");
}

export async function loadInvestmentSummary(token: string): Promise<InvestmentSummaryData> {
  const outcome = await buildSummary(callBackend, token);
  if (outcome.ok) return { summary: outcome.summary };
  const result: BackendResult<never> = outcome.result;
  await expireOnUnauthorized(result, "loader.investmentSummary");
  throw new Error(`loader.investmentSummary unavailable (${result.status})`);
}

export async function loadInvestment(token: string, id: string): Promise<InvestmentData | null> {
  if (!isUuid(id)) return null;
  return load(`/v1/investments/${id}`, token, "loader.investment", toInvestmentDetail, { notFound: true });
}

export async function loadPaymentStatus(token: string, id: string): Promise<PaymentStatusData | null> {
  if (!isUuid(id)) return null;
  return load(`/v1/investments/${id}/payment`, token, "loader.paymentStatus", toPaymentStatus, { notFound: true });
}

export async function loadDocuments(token: string): Promise<DocumentsData> {
  const data = await load("/v1/documents", token, "loader.documents", (raw) => {
    const documents = toDocumentList(raw);
    return documents ? { documents } : null;
  });
  return required(data, "loader.documents");
}

export async function loadFirstStatementPage(token: string): Promise<StatementPage> {
  const data = await load(statementPath(null) ?? "/v1/statements", token, "loader.statements", (raw) => {
    const page = toStatementPage(raw);
    return page ? toPortalStatementPage(page) : null;
  });
  return required(data, "loader.statements");
}
