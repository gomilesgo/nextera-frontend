import { documentKinds, investmentStatuses } from "@nextera/contracts";
import type {
  AdminInvestment,
  AdminInvestmentDetail,
  GrowthPeriod,
  InvestmentDocument,
  InvestmentGrowth,
  InvestmentTerms,
} from "@nextera/contracts";
import { isAdminPayment, isPaise, isPaymentEvent } from "@/lib/payments/shape";
import { isListOf, isNullableString, isOneOf, isRecord, isString, isUuid } from "@/lib/shape";

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isNullablePaise(value: unknown): value is number | null {
  return value === null || isPaise(value);
}

export function isInvestmentTerms(value: unknown): value is InvestmentTerms {
  return (
    isRecord(value) &&
    isString(value.planId) &&
    isString(value.planSlug) &&
    isString(value.planName) &&
    isCount(value.rateBps) &&
    isCount(value.tenureMonths) &&
    isPaise(value.minPaise) &&
    isPaise(value.maxPaise) &&
    isString(value.returnsCredit) &&
    isString(value.principalRelease) &&
    isString(value.interest)
  );
}

export function isAdminInvestment(value: unknown): value is AdminInvestment {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isUuid(value.customerId) &&
    isNullableString(value.customerName) &&
    isString(value.planId) &&
    isString(value.planSlug) &&
    isString(value.planName) &&
    isPaise(value.principalPaise) &&
    isCount(value.rateBps) &&
    isCount(value.tenureMonths) &&
    isPaise(value.monthlyReturnPaise) &&
    isOneOf(investmentStatuses, value.status) &&
    isNullableString(value.startDate) &&
    isNullableString(value.maturityDate) &&
    isNullableString(value.bondNo) &&
    isNullableString(value.consentedAt) &&
    isNullableString(value.activatedAt) &&
    isNullableString(value.maturedAt) &&
    isNullableString(value.cancelledAt) &&
    isString(value.createdAt) &&
    isInvestmentTerms(value.terms) &&
    isNullableString(value.cancelReason)
  );
}

function isGrowthPeriod(value: unknown): value is GrowthPeriod {
  return (
    isRecord(value) &&
    isCount(value.periodNo) &&
    isString(value.dueDate) &&
    isPaise(value.grossPaise) &&
    isPaise(value.cumulativePaise) &&
    typeof value.credited === "boolean" &&
    isNullablePaise(value.netPaise) &&
    isNullablePaise(value.tdsPaise)
  );
}

export function isInvestmentGrowth(value: unknown): value is InvestmentGrowth {
  return (
    isRecord(value) &&
    isPaise(value.principalBalancePaise) &&
    isPaise(value.creditedGrossPaise) &&
    isPaise(value.creditedNetPaise) &&
    isPaise(value.tdsPaise) &&
    isCount(value.periodsCredited) &&
    isNullableString(value.nextCreditDate) &&
    isNullablePaise(value.nextCreditPaise) &&
    typeof value.scheduleIsIndicative === "boolean" &&
    isListOf(value.schedule, isGrowthPeriod)
  );
}

export function isInvestmentDocument(value: unknown): value is InvestmentDocument {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isOneOf(documentKinds, value.kind) &&
    (value.investmentId === null || isUuid(value.investmentId)) &&
    isString(value.fileName) &&
    isString(value.sha256) &&
    isCount(value.sizeBytes) &&
    isNullableString(value.acceptedAt) &&
    isString(value.createdAt)
  );
}

export function isAdminInvestmentDetail(value: unknown): value is AdminInvestmentDetail {
  return (
    isRecord(value) &&
    isAdminInvestment(value.investment) &&
    isInvestmentGrowth(value.growth) &&
    isListOf(value.payments, isAdminPayment) &&
    isListOf(value.events, isPaymentEvent) &&
    isListOf(value.documents, isInvestmentDocument)
  );
}
