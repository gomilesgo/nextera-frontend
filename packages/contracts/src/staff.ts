import { z } from "zod";
import { staffRoles } from "./auth";
import type { StaffProfile } from "./auth";

export const STAFF_PASSWORD_MIN_LENGTH = 12;

export const staffInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  name: z.string().trim().min(2, "Enter the staff member's name").max(80),
  role: z.enum(staffRoles),
});

export const staffRoleUpdateSchema = z.object({
  role: z.enum(staffRoles),
});

export const staffPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(200),
  newPassword: z
    .string()
    .min(STAFF_PASSWORD_MIN_LENGTH, `Use at least ${STAFF_PASSWORD_MIN_LENGTH} characters`)
    .max(200),
});

export type StaffInvite = z.infer<typeof staffInviteSchema>;
export type StaffRoleUpdate = z.infer<typeof staffRoleUpdateSchema>;
export type StaffPasswordChange = z.infer<typeof staffPasswordChangeSchema>;

export type StaffMember = StaffProfile & {
  disabledAt: string | null;
  lockedUntil: string | null;
  createdAt: string;
};

export type StaffCredentialsResponse = {
  staff: StaffMember;
  temporaryPassword: string;
  totpSecret: string;
  otpauthUrl: string;
};

export type AssignableStaff = {
  id: string;
  name: string;
  role: import("./auth").StaffRole;
};

export type AssignableStaffResponse = {
  staff: AssignableStaff[];
};
