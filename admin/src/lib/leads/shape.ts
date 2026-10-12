import { customerStatuses, kycStatuses, leadSources, leadStatuses } from "@nextera/contracts";
import type {
  AdminLead,
  AdminLeadListResponse,
  AdminLeadResponse,
  CustomerProfile,
  LeadConvertResponse,
  StaffRef,
} from "@nextera/contracts";
import { isListOf, isNullableString, isOneOf, isRecord, isString, isUuid } from "@/lib/shape";

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

export function isStaffRef(value: unknown): value is StaffRef {
  return isRecord(value) && isUuid(value.id) && isString(value.name);
}

export function isCustomerProfile(value: unknown): value is CustomerProfile {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isString(value.phone) &&
    isNullableString(value.name) &&
    isNullableString(value.email) &&
    isOneOf(customerStatuses, value.status) &&
    isOneOf(kycStatuses, value.kycStatus)
  );
}

export function isAdminLead(value: unknown): value is AdminLead {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isString(value.ref) &&
    isString(value.name) &&
    isString(value.phone) &&
    isNullableString(value.email) &&
    isNullableString(value.interest) &&
    (value.planId === null || isUuid(value.planId)) &&
    isNullableNumber(value.amountPaise) &&
    isNullableString(value.message) &&
    isOneOf(leadSources, value.source) &&
    isNullableString(value.path) &&
    isNullableString(value.ip) &&
    isNullableString(value.userAgent) &&
    isOneOf(leadStatuses, value.status) &&
    isNullableString(value.notes) &&
    (value.assignee === null || isStaffRef(value.assignee)) &&
    (value.convertedCustomerId === null || isUuid(value.convertedCustomerId)) &&
    isNullableString(value.convertedAt) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

export function isAdminLeadList(value: unknown): value is AdminLeadListResponse {
  return isRecord(value) && isListOf(value.items, isAdminLead) && isNullableString(value.nextCursor);
}

export function isAdminLeadResponse(value: unknown): value is AdminLeadResponse {
  return isRecord(value) && isAdminLead(value.lead);
}

export function isLeadConvertResponse(value: unknown): value is LeadConvertResponse {
  return (
    isRecord(value) && isAdminLead(value.lead) && isCustomerProfile(value.customer) && typeof value.created === "boolean"
  );
}
