import { documentKinds, investmentStatuses, paymentStatuses } from "@nextera/contracts";
import type {
  GrowthPeriod,
  Investment,
  InvestmentDetail,
  InvestmentDocument,
  InvestmentGrowth,
  InvestmentStatus,
  PaymentStatusResponse,
  PaymentSummary,
  StatementEntry,
  StatementResponse,
} from "@nextera/contracts";

type Raw = Record<string, unknown>;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function record(value: unknown): Raw | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null;
}

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function nullable<T>(value: unknown, check: (input: unknown) => input is T): T | null | undefined {
  if (value === null || value === undefined) return null;
  return check(value) ? value : undefined;
}

function oneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

export function toInvestment(raw: unknown): Investment | null {
  const value = record(raw);
  if (!value) return null;
  const startDate = nullable(value.startDate, isIsoDate);
  const maturityDate = nullable(value.maturityDate, isIsoDate);
  const bondNo = nullable(value.bondNo, isString);
  const consentedAt = nullable(value.consentedAt, isString);
  const activatedAt = nullable(value.activatedAt, isString);
  const maturedAt = nullable(value.maturedAt, isString);
  const cancelledAt = nullable(value.cancelledAt, isString);
  if (
    !isUuid(value.id) ||
    !isString(value.planId) ||
    !isString(value.planSlug) ||
    !isString(value.planName) ||
    !isInt(value.principalPaise) ||
    value.principalPaise <= 0 ||
    !isInt(value.rateBps) ||
    !isInt(value.tenureMonths) ||
    value.tenureMonths < 1 ||
    !isInt(value.monthlyReturnPaise) ||
    !oneOf(investmentStatuses, value.status) ||
    !isString(value.createdAt) ||
    startDate === undefined ||
    maturityDate === undefined ||
    bondNo === undefined ||
    consentedAt === undefined ||
    activatedAt === undefined ||
    maturedAt === undefined ||
    cancelledAt === undefined
  ) {
    return null;
  }
  return {
    id: value.id,
    planId: value.planId,
    planSlug: value.planSlug,
    planName: value.planName,
    principalPaise: value.principalPaise,
    rateBps: value.rateBps,
    tenureMonths: value.tenureMonths,
    monthlyReturnPaise: value.monthlyReturnPaise,
    status: value.status,
    startDate,
    maturityDate,
    bondNo,
    consentedAt,
    activatedAt,
    maturedAt,
    cancelledAt,
    createdAt: value.createdAt,
  };
}

export function toDocument(raw: unknown): InvestmentDocument | null {
  const value = record(raw);
  if (!value) return null;
  const investmentId = nullable(value.investmentId, isUuid);
  const acceptedAt = nullable(value.acceptedAt, isString);
  if (
    !isUuid(value.id) ||
    !oneOf(documentKinds, value.kind) ||
    !isString(value.fileName) ||
    !isString(value.sha256) ||
    !isInt(value.sizeBytes) ||
    !isString(value.createdAt) ||
    investmentId === undefined ||
    acceptedAt === undefined
  ) {
    return null;
  }
  return {
    id: value.id,
    kind: value.kind,
    investmentId,
    fileName: value.fileName,
    sha256: value.sha256,
    sizeBytes: value.sizeBytes,
    acceptedAt,
    createdAt: value.createdAt,
  };
}

export function toPaymentSummary(raw: unknown): PaymentSummary | null {
  const value = record(raw);
  if (!value) return null;
  const gatewayStatus = nullable(value.gatewayStatus, isString);
  const paidAt = nullable(value.paidAt, isString);
  if (
    !isUuid(value.id) ||
    !isString(value.orderId) ||
    !isInt(value.amountPaise) ||
    !oneOf(paymentStatuses, value.status) ||
    !isString(value.expiresAt) ||
    !isString(value.createdAt) ||
    gatewayStatus === undefined ||
    paidAt === undefined
  ) {
    return null;
  }
  return {
    id: value.id,
    orderId: value.orderId,
    amountPaise: value.amountPaise,
    status: value.status,
    gatewayStatus,
    expiresAt: value.expiresAt,
    paidAt,
    createdAt: value.createdAt,
  };
}

function toGrowthPeriod(raw: unknown): GrowthPeriod | null {
  const value = record(raw);
  if (!value) return null;
  const netPaise = nullable(value.netPaise, isInt);
  const tdsPaise = nullable(value.tdsPaise, isInt);
  if (
    !isInt(value.periodNo) ||
    !isIsoDate(value.dueDate) ||
    !isInt(value.grossPaise) ||
    !isInt(value.cumulativePaise) ||
    typeof value.credited !== "boolean" ||
    netPaise === undefined ||
    tdsPaise === undefined
  ) {
    return null;
  }
  return {
    periodNo: value.periodNo,
    dueDate: value.dueDate,
    grossPaise: value.grossPaise,
    cumulativePaise: value.cumulativePaise,
    credited: value.credited,
    netPaise,
    tdsPaise,
  };
}

function listOf<T>(raw: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(raw)) return null;
  const items: T[] = [];
  for (const item of raw) {
    const parsed = parse(item);
    if (!parsed) return null;
    items.push(parsed);
  }
  return items;
}

export function toGrowth(raw: unknown): InvestmentGrowth | null {
  const value = record(raw);
  if (!value) return null;
  const nextCreditDate = nullable(value.nextCreditDate, isIsoDate);
  const nextCreditPaise = nullable(value.nextCreditPaise, isInt);
  const schedule = listOf(value.schedule, toGrowthPeriod);
  if (
    !isInt(value.principalBalancePaise) ||
    !isInt(value.creditedGrossPaise) ||
    !isInt(value.creditedNetPaise) ||
    !isInt(value.tdsPaise) ||
    !isInt(value.periodsCredited) ||
    typeof value.scheduleIsIndicative !== "boolean" ||
    nextCreditDate === undefined ||
    nextCreditPaise === undefined ||
    !schedule
  ) {
    return null;
  }
  return {
    principalBalancePaise: value.principalBalancePaise,
    creditedGrossPaise: value.creditedGrossPaise,
    creditedNetPaise: value.creditedNetPaise,
    tdsPaise: value.tdsPaise,
    periodsCredited: value.periodsCredited,
    nextCreditDate,
    nextCreditPaise,
    scheduleIsIndicative: value.scheduleIsIndicative,
    schedule,
  };
}

export function toInvestmentList(raw: unknown): Investment[] | null {
  const value = record(raw);
  return value ? listOf(value.investments, toInvestment) : null;
}

export function toInvestmentDetail(raw: unknown): InvestmentDetail | null {
  const value = record(raw);
  if (!value) return null;
  const investment = toInvestment(value.investment);
  const growth = toGrowth(value.growth);
  const documents = listOf(value.documents, toDocument);
  const payment = value.payment === null || value.payment === undefined ? null : toPaymentSummary(value.payment);
  if (!investment || !growth || !documents) return null;
  if (value.payment !== null && value.payment !== undefined && !payment) return null;
  return { investment, growth, documents, payment };
}

export function toPaymentStatus(raw: unknown): PaymentStatusResponse | null {
  const value = record(raw);
  if (!value) return null;
  const investment = toInvestment(value.investment);
  const payment = value.payment === null || value.payment === undefined ? null : toPaymentSummary(value.payment);
  if (!investment) return null;
  if (value.payment !== null && value.payment !== undefined && !payment) return null;
  return { investment, payment };
}

export function toDocumentList(raw: unknown): InvestmentDocument[] | null {
  const value = record(raw);
  return value ? listOf(value.documents, toDocument) : null;
}

function toStatementEntry(raw: unknown): StatementEntry | null {
  const value = record(raw);
  if (!value) return null;
  const investmentId = nullable(value.investmentId, isUuid);
  if (
    !isString(value.id) ||
    !isString(value.transactionId) ||
    !isString(value.account) ||
    (value.direction !== "debit" && value.direction !== "credit") ||
    !isInt(value.amountPaise) ||
    !isString(value.refType) ||
    !isString(value.refId) ||
    !isString(value.memo) ||
    !isString(value.createdAt) ||
    investmentId === undefined
  ) {
    return null;
  }
  return {
    id: value.id,
    transactionId: value.transactionId,
    account: value.account,
    investmentId,
    direction: value.direction,
    amountPaise: value.amountPaise,
    refType: value.refType,
    refId: value.refId,
    memo: value.memo,
    createdAt: value.createdAt,
  };
}

export const STATEMENT_CURSOR = /^\d{1,15}$/;

export function toStatementPage(raw: unknown): StatementResponse | null {
  const value = record(raw);
  if (!value) return null;
  const entries = listOf(value.entries, toStatementEntry);
  const nextCursor = nullable(value.nextCursor, isString);
  if (!entries || nextCursor === undefined) return null;
  if (nextCursor !== null && !STATEMENT_CURSOR.test(nextCursor)) return null;
  return { entries, nextCursor };
}

export const investmentStatusCopy: Record<InvestmentStatus, { label: string; tone: "warning" | "success" | "info" | "neutral" }> = {
  pending_payment: { label: "Awaiting payment", tone: "warning" },
  active: { label: "Active", tone: "success" },
  matured: { label: "Matured", tone: "info" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export type InvestmentStep = "agreement" | "payment" | "done" | "closed";

export function investmentStep(investment: Pick<Investment, "status" | "consentedAt">): InvestmentStep {
  if (investment.status === "active" || investment.status === "matured") return "done";
  if (investment.status === "cancelled") return "closed";
  return investment.consentedAt ? "payment" : "agreement";
}
