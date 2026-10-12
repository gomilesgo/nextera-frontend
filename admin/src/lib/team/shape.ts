import type { StaffCredentialsResponse, StaffMember } from "@nextera/contracts";
import { isNullableString, isRecord, isString, isUuid } from "@/lib/shape";
import { toAdminStaff } from "@/lib/staff";

export function isStaffMember(value: unknown): value is StaffMember {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    toAdminStaff(value) !== null &&
    typeof value.mustChangePassword === "boolean" &&
    isNullableString(value.disabledAt) &&
    isNullableString(value.lockedUntil) &&
    isString(value.createdAt)
  );
}

export function isStaffCredentials(value: unknown): value is StaffCredentialsResponse {
  return (
    isRecord(value) &&
    isStaffMember(value.staff) &&
    isString(value.temporaryPassword) &&
    value.temporaryPassword.length > 0 &&
    isString(value.totpSecret) &&
    /^[A-Z2-7]+=*$/.test(value.totpSecret) &&
    isString(value.otpauthUrl) &&
    value.otpauthUrl.startsWith("otpauth://totp/")
  );
}
