import { z } from "zod";
import { STAFF_PASSWORD_MIN_LENGTH, staffPasswordChangeSchema } from "@nextera/contracts";
import type { StaffPasswordChange } from "@nextera/contracts";

export const MIN_STAFF_PASSWORD = STAFF_PASSWORD_MIN_LENGTH;

export const passwordChangeFormSchema = staffPasswordChangeSchema
  .extend({
    newPassword: staffPasswordChangeSchema.shape.newPassword.max(200, "Use at most 200 characters"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "The passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "Choose a password different from the current one",
    path: ["newPassword"],
  });

export type PasswordChangeField = "currentPassword" | "newPassword" | "confirmPassword";

export type PasswordChangeRequest = StaffPasswordChange;

export function parsePasswordChange(
  formData: FormData,
):
  | { ok: true; request: PasswordChangeRequest }
  | { ok: false; fields: Partial<Record<PasswordChangeField, string[]>> } {
  const parsed = passwordChangeFormSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) return { ok: false, fields: parsed.error.flatten().fieldErrors };
  return {
    ok: true,
    request: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword },
  };
}
