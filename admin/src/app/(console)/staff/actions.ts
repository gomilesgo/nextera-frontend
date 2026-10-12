"use server";

import type { StaffCredentialsResponse, StaffMember, StaffRole } from "@nextera/contracts";
import type { ActionOutcome } from "@/lib/actions/outcome";
import { CHECK_FIELDS, backendFailure, unexpectedResponse } from "@/lib/actions/server";
import type { BackendResult } from "@/lib/backend/client";
import { authorizeAction, staffRequest } from "@/lib/session";
import { isRecord, isUuid } from "@/lib/shape";
import { buildInvite, parseRole, readInviteForm } from "@/lib/team/form";
import { qrMatrix } from "@/lib/team/qr";
import type { QrMatrix } from "@/lib/team/qr";
import { isStaffCredentials, isStaffMember } from "@/lib/team/shape";

export type IssuedCredentials = StaffCredentialsResponse & { qr: QrMatrix };
export type CredentialsResult = ActionOutcome<IssuedCredentials>;
export type StaffMemberResult = ActionOutcome<StaffMember>;

const missing = { status: "error", code: "not_found", message: "Staff member not found" } as const;

function credentialsFrom(result: BackendResult<unknown>): CredentialsResult {
  if (!result.ok) return backendFailure(result.error);
  if (!isStaffCredentials(result.data)) return unexpectedResponse("credentials response");
  const { staff, temporaryPassword, totpSecret, otpauthUrl } = result.data;
  return {
    status: "ok",
    data: { staff, temporaryPassword, totpSecret, otpauthUrl, qr: qrMatrix(otpauthUrl) },
  };
}

function memberFrom(result: BackendResult<unknown>): StaffMemberResult {
  if (!result.ok) return backendFailure(result.error);
  const staff = isRecord(result.data) ? result.data.staff : null;
  return isStaffMember(staff) ? { status: "ok", data: staff } : unexpectedResponse("staff member");
}

export async function inviteStaff(formData: FormData): Promise<CredentialsResult> {
  const auth = await authorizeAction("staff.manage");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };

  const built = buildInvite(readInviteForm(formData));
  if (!built.ok) return { status: "error", code: "validation", message: CHECK_FIELDS, errors: built.errors };

  return credentialsFrom(
    await staffRequest<unknown>(auth.token, "/v1/admin/staff", { method: "POST", json: built.payload }),
  );
}

export async function changeStaffRole(id: string, role: StaffRole): Promise<StaffMemberResult> {
  const auth = await authorizeAction("staff.manage");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };
  if (!isUuid(id)) return missing;
  const parsed = parseRole(role);
  if (!parsed) return { status: "error", code: "validation", message: "Choose a valid role" };

  return memberFrom(await staffRequest<unknown>(auth.token, `/v1/admin/staff/${id}`, { method: "PATCH", json: { role: parsed } }));
}

export async function setStaffDisabled(id: string, disabled: boolean): Promise<StaffMemberResult> {
  const auth = await authorizeAction("staff.manage");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };
  if (!isUuid(id)) return missing;
  if (typeof disabled !== "boolean") return { status: "error", code: "validation", message: "Unsupported change" };

  const path = `/v1/admin/staff/${id}/${disabled ? "disable" : "enable"}`;
  return memberFrom(await staffRequest<unknown>(auth.token, path, { method: "POST" }));
}

export async function resetStaffCredentials(id: string): Promise<CredentialsResult> {
  const auth = await authorizeAction("staff.manage");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };
  if (!isUuid(id)) return missing;

  return credentialsFrom(
    await staffRequest<unknown>(auth.token, `/v1/admin/staff/${id}/reset-credentials`, { method: "POST" }),
  );
}
