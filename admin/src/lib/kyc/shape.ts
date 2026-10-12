import { customerStatuses, kycStatuses } from "@nextera/contracts";
import type {
  Address,
  AdminCustomerKyc,
  CustomerKycResponse,
  CustomerProfile,
  KycProfile,
  KycQueueItem,
  KycStatus,
} from "@nextera/contracts";
import { isAdminBankAccount } from "@/lib/bank/shape";
import { isListOf, isNullableString, isOneOf, isRecord, isString, isUuid } from "@/lib/shape";

export function isKycStatus(value: unknown): value is KycStatus {
  return isOneOf(kycStatuses, value);
}

function hasKycFields(value: Record<string, unknown>): boolean {
  return (
    isString(value.panMasked) &&
    isString(value.panName) &&
    isString(value.dob) &&
    isString(value.submittedAt) &&
    isNullableString(value.verifiedAt) &&
    isNullableString(value.rejectionReason)
  );
}

function isAddress(value: unknown): value is Address {
  return (
    isRecord(value) &&
    isString(value.line1) &&
    isString(value.line2) &&
    isString(value.city) &&
    isString(value.state) &&
    isString(value.pincode)
  );
}

export function isKycProfile(value: unknown): value is KycProfile {
  return isRecord(value) && hasKycFields(value) && isAddress(value.address);
}

export function isKycQueueItem(value: unknown): value is KycQueueItem {
  return (
    isRecord(value) &&
    isUuid(value.customerId) &&
    isString(value.phone) &&
    isNullableString(value.name) &&
    isKycStatus(value.kycStatus) &&
    hasKycFields(value)
  );
}

function isCustomerProfile(value: unknown): value is CustomerProfile {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isString(value.phone) &&
    isNullableString(value.name) &&
    isNullableString(value.email) &&
    isOneOf(customerStatuses, value.status) &&
    isKycStatus(value.kycStatus)
  );
}

export function isAdminCustomerKyc(value: unknown): value is AdminCustomerKyc {
  if (!isRecord(value)) return false;
  const profile = value.profile;
  return (
    isCustomerProfile(value.customer) &&
    isKycStatus(value.kycStatus) &&
    (profile === null || (isKycProfile(profile) && isNullableString((profile as Record<string, unknown>).reviewedBy))) &&
    isListOf(value.bankAccounts, isAdminBankAccount)
  );
}

export function isCustomerKycResponse(value: unknown): value is CustomerKycResponse {
  return isRecord(value) && isKycStatus(value.kycStatus) && (value.profile === null || isKycProfile(value.profile));
}
