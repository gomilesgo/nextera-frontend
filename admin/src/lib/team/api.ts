import "server-only";
import type { AssignableStaff, AssignableStaffResponse } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { readBackend, unwrapForPage } from "@/lib/backend/read";
import type { StaffListResponse } from "@/lib/queries/options";
import { isListOf, isRecord, isString, isUuid } from "@/lib/shape";
import { isStaffMember } from "./shape";

function isAssignableStaff(value: unknown): value is AssignableStaff {
  return isRecord(value) && isUuid(value.id) && isString(value.name) && isString(value.role);
}

export function fetchAssignableStaff(token: string): Promise<BackendResult<AssignableStaffResponse>> {
  return readBackend(
    token,
    "/v1/admin/staff/assignable",
    (data) => (isRecord(data) && isListOf(data.staff, isAssignableStaff) ? { staff: data.staff } : null),
    "assignable staff",
  );
}

export async function loadAssignableStaff(token: string): Promise<AssignableStaffResponse> {
  return unwrapForPage(await fetchAssignableStaff(token)) ?? { staff: [] };
}

export function fetchStaffList(token: string): Promise<BackendResult<StaffListResponse>> {
  return readBackend(
    token,
    "/v1/admin/staff",
    (data) => (isRecord(data) && isListOf(data.staff, isStaffMember) ? { staff: data.staff } : null),
    "staff list",
  );
}

export async function loadStaffList(token: string): Promise<StaffListResponse> {
  return unwrapForPage(await fetchStaffList(token)) ?? { staff: [] };
}
