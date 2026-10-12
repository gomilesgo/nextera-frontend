import { staffInviteSchema, staffRoleUpdateSchema } from "@nextera/contracts";
import type { StaffInvite, StaffRole } from "@nextera/contracts";
import { issuesToFields } from "@/lib/actions/outcome";
import type { FieldErrors } from "@/lib/actions/outcome";

export type InviteFormValues = { email: string; name: string; role: string };

export function readInviteForm(formData: FormData): InviteFormValues {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return { email: text("email"), name: text("name"), role: text("role") };
}

export function buildInvite(values: InviteFormValues): { ok: true; payload: StaffInvite } | { ok: false; errors: FieldErrors } {
  const parsed = staffInviteSchema.safeParse(values);
  if (parsed.success) return { ok: true, payload: parsed.data };
  const errors = issuesToFields(parsed.error.issues);
  if (errors.role) errors.role = ["Choose a role"];
  return { ok: false, errors };
}

export function parseRole(role: unknown): StaffRole | null {
  const parsed = staffRoleUpdateSchema.safeParse({ role });
  return parsed.success ? parsed.data.role : null;
}
