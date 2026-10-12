import { bankAccountStatuses, customerOrigins, customerStatuses, kycStatuses, ledgerDirections } from "@nextera/contracts";
import type {
  AdminCustomer,
  AdminCustomerBankSummary,
  AdminCustomerDetail,
  AdminCustomerKycSummary,
  AdminCustomerList,
  AdminPage,
  CustomerAccountBalance,
  CustomerLedgerEntry,
  CustomerLedgerPage,
  ManualAdjustmentResponse,
} from "@nextera/contracts";
import { isNullableString, isOneOf, isRecord, isUuid } from "@/lib/shape";

export const isCustomerId = isUuid;

function isInteger(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

export function isAdminCustomer(value: unknown): value is AdminCustomer {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.phone === "string" &&
    isNullableString(value.name) &&
    isNullableString(value.email) &&
    isOneOf(customerStatuses, value.status) &&
    isOneOf(kycStatuses, value.kycStatus) &&
    isOneOf(customerOrigins, value.createdVia) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function isPage<T>(value: unknown, isItem: (item: unknown) => item is T): value is AdminPage<T> {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isItem) &&
    isInteger(value.total) &&
    isInteger(value.limit) &&
    isInteger(value.offset)
  );
}

export function isCustomerList(value: unknown): value is AdminCustomerList {
  return isPage(value, isAdminCustomer);
}

function isKycSummary(value: unknown): value is AdminCustomerKycSummary {
  return (
    isRecord(value) &&
    isOneOf(kycStatuses, value.status) &&
    isNullableString(value.panMasked) &&
    isNullableString(value.panName) &&
    isNullableString(value.submittedAt) &&
    isNullableString(value.verifiedAt) &&
    isNullableString(value.rejectionReason)
  );
}

function isBankSummary(value: unknown): value is AdminCustomerBankSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.accountMasked === "string" &&
    typeof value.ifsc === "string" &&
    typeof value.holderName === "string" &&
    isOneOf(bankAccountStatuses, value.status) &&
    typeof value.isPrimary === "boolean" &&
    isNullableString(value.verifiedAt)
  );
}

function isBalance(value: unknown): value is CustomerAccountBalance {
  return isRecord(value) && typeof value.account === "string" && isInteger(value.balancePaise);
}

export function isCustomerDetail(value: unknown): value is AdminCustomerDetail {
  return (
    isRecord(value) &&
    isAdminCustomer(value.customer) &&
    isKycSummary(value.kyc) &&
    Array.isArray(value.bankAccounts) &&
    value.bankAccounts.every(isBankSummary) &&
    Array.isArray(value.balances) &&
    value.balances.every(isBalance) &&
    isInteger(value.totalBalancePaise)
  );
}

export function isLedgerEntry(value: unknown): value is CustomerLedgerEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.transactionId === "string" &&
    typeof value.at === "string" &&
    typeof value.account === "string" &&
    isOneOf(ledgerDirections, value.direction) &&
    isInteger(value.amountPaise) &&
    isInteger(value.runningBalancePaise) &&
    typeof value.description === "string" &&
    typeof value.refType === "string" &&
    typeof value.refId === "string"
  );
}

export function isLedgerPage(value: unknown): value is CustomerLedgerPage {
  return isPage(value, isLedgerEntry);
}

export function isAdjustmentResponse(value: unknown): value is ManualAdjustmentResponse {
  if (!isRecord(value) || !isRecord(value.adjustment)) return false;
  const adjustment = value.adjustment;
  return (
    typeof adjustment.transactionId === "string" &&
    typeof adjustment.customerId === "string" &&
    adjustment.account === "wallet" &&
    isOneOf(ledgerDirections, adjustment.direction) &&
    isInteger(adjustment.amountPaise) &&
    typeof adjustment.reason === "string" &&
    typeof adjustment.idempotencyKey === "string" &&
    typeof adjustment.createdAt === "string" &&
    isInteger(value.balancePaise) &&
    typeof value.replayed === "boolean"
  );
}
