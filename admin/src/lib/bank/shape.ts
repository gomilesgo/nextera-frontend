import { bankAccountStatuses } from "@nextera/contracts";
import type { AdminBankAccount, BankAccountStatus } from "@nextera/contracts";
import { isNullableString, isOneOf, isRecord, isString, isUuid } from "@/lib/shape";

export function isBankStatus(value: unknown): value is BankAccountStatus {
  return isOneOf(bankAccountStatuses, value);
}

export function isAdminBankAccount(value: unknown): value is AdminBankAccount {
  if (!isRecord(value)) return false;
  return (
    isUuid(value.id) &&
    isUuid(value.customerId) &&
    isString(value.accountMasked) &&
    isString(value.accountLast4) &&
    isString(value.ifsc) &&
    isString(value.holderName) &&
    isNullableString(value.nameAtBank) &&
    isNullableString(value.nameMatchResult) &&
    isNullableString(value.nameMatchScore) &&
    isBankStatus(value.status) &&
    typeof value.isPrimary === "boolean" &&
    isNullableString(value.verifiedAt) &&
    isNullableString(value.reviewNote) &&
    isNullableString(value.pennyDropRef) &&
    isNullableString(value.failureReason) &&
    isNullableString(value.holdReason) &&
    isNullableString(value.reviewedBy) &&
    isString(value.createdAt)
  );
}
