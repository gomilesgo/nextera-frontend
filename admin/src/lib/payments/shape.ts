import {
  paymentActivationSources,
  paymentEventSources,
  paymentFlagReasons,
  paymentFlagResolutions,
  paymentStatuses,
} from "@nextera/contracts";
import type { AdminPayment, PaymentEvent, PaymentSummary } from "@nextera/contracts";
import { isNullableString, isOneOf, isRecord, isString, isUuid } from "@/lib/shape";

export function isPaise(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isNullableOneOf<T extends string>(options: readonly T[], value: unknown): value is T | null {
  return value === null || isOneOf(options, value);
}

function isNullableUuid(value: unknown): value is string | null {
  return value === null || isUuid(value);
}

export function isPaymentSummary(value: unknown): value is PaymentSummary {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isString(value.orderId) &&
    isPaise(value.amountPaise) &&
    isOneOf(paymentStatuses, value.status) &&
    isNullableString(value.gatewayStatus) &&
    isString(value.expiresAt) &&
    isNullableString(value.paidAt) &&
    isString(value.createdAt)
  );
}

export function isAdminPayment(value: unknown): value is AdminPayment {
  return (
    isRecord(value) &&
    isUuid(value.investmentId) &&
    isUuid(value.customerId) &&
    isNullableString(value.cfOrderId) &&
    isNullableString(value.cfPaymentId) &&
    isNullableOneOf(paymentFlagReasons, value.flagReason) &&
    isNullableOneOf(paymentActivationSources, value.activationSource) &&
    isNullableString(value.lastCheckedAt) &&
    isPaymentSummary(value)
  );
}

export function isPaymentEvent(value: unknown): value is PaymentEvent {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isNullableUuid(value.paymentId) &&
    isNullableString(value.orderId) &&
    isOneOf(paymentEventSources, value.source) &&
    isString(value.type) &&
    isNullableOneOf(paymentFlagReasons, value.flagReason) &&
    isNullableString(value.flagDetail) &&
    isString(value.receivedAt) &&
    isNullableString(value.processedAt) &&
    isNullableString(value.resolvedAt) &&
    isNullableUuid(value.resolvedBy) &&
    isNullableOneOf(paymentFlagResolutions, value.resolutionType) &&
    isNullableString(value.resolutionReference) &&
    isNullableString(value.resolutionNote)
  );
}

export function isPaymentFlag(value: unknown): value is PaymentEvent {
  return isPaymentEvent(value) && value.flagReason !== null;
}
