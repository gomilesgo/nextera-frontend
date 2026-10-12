import { staffRoles } from "@nextera/contracts";
import type { StaffProfile, StaffRole } from "@nextera/contracts";

export type AdminStaff = StaffProfile & { mustChangePassword: boolean };

export const roleLabels: Record<StaffRole, string> = {
  owner: "Owner",
  ops: "Operations",
  support: "Support",
};

function isRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (staffRoles as readonly string[]).includes(value);
}

export function toAdminStaff(raw: unknown): AdminStaff | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.email !== "string" ||
    typeof value.name !== "string" ||
    !isRole(value.role)
  ) {
    return null;
  }
  return {
    id: value.id,
    email: value.email,
    name: value.name,
    role: value.role,
    mustChangePassword: value.mustChangePassword === true,
  };
}
