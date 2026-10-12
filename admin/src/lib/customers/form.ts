import {
  adminCustomerCreateSchema,
  adminCustomerUpdateSchema,
  customerStatusChangeSchema,
} from "@nextera/contracts";
import type { AdminCustomerCreate, AdminCustomerUpdate, CustomerStatusChange } from "@nextera/contracts";
import { issuesToFields } from "@/lib/listing/params";
import { addError, mapFields } from "@/lib/actions/outcome";
import type { FieldErrors } from "@/lib/actions/outcome";
import { previewIndianMobile } from "./phone";

export const customerStatusActions = ["block", "unblock", "close"] as const;
export type CustomerStatusAction = (typeof customerStatusActions)[number];

export type CustomerFormValues = { name: string; email: string; phone: string | null };

export type Built<T> = { ok: true; payload: T } | { ok: false; errors: FieldErrors };

const profileAliases: Record<string, string> = { name: "name", email: "email", phone: "phone" };

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function readCustomerForm(formData: FormData): CustomerFormValues {
  return {
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: formData.has("phone") ? text(formData, "phone") : null,
  };
}

function checkPhone(raw: string, errors: FieldErrors): string | null {
  const preview = previewIndianMobile(raw);
  if (preview.status === "valid") return preview.e164;
  addError(errors, "phone", preview.status === "empty" ? "Enter the customer's mobile number" : preview.message);
  return null;
}

function fromIssues(issues: Parameters<typeof issuesToFields>[0]): FieldErrors {
  return mapFields(issuesToFields(issues), profileAliases);
}

export function buildCustomerCreate(values: CustomerFormValues): Built<AdminCustomerCreate> {
  const errors: FieldErrors = {};
  const phone = checkPhone(values.phone ?? "", errors);
  const parsed = adminCustomerCreateSchema.safeParse({ phone: phone ?? values.phone ?? "", name: values.name, email: values.email });
  if (!parsed.success) {
    for (const [field, messages] of Object.entries(fromIssues(parsed.error.issues))) {
      if (field === "phone" && errors.phone) continue;
      for (const message of messages ?? []) addError(errors, field, message);
    }
  }
  if (Object.keys(errors).length > 0 || !parsed.success) return { ok: false, errors };
  return { ok: true, payload: parsed.data };
}

export function buildCustomerUpdate(values: CustomerFormValues): Built<AdminCustomerUpdate> {
  const errors: FieldErrors = {};
  const phone = values.phone === null ? undefined : checkPhone(values.phone, errors);
  const parsed = adminCustomerUpdateSchema.safeParse({
    name: values.name,
    email: values.email,
    ...(phone ? { phone } : {}),
  });
  if (!parsed.success) {
    for (const [field, messages] of Object.entries(fromIssues(parsed.error.issues))) {
      for (const message of messages ?? []) addError(errors, field, message);
    }
  }
  if (Object.keys(errors).length > 0 || !parsed.success) return { ok: false, errors };
  return { ok: true, payload: parsed.data };
}

export function isStatusAction(value: unknown): value is CustomerStatusAction {
  return typeof value === "string" && (customerStatusActions as readonly string[]).includes(value);
}

export function buildStatusChange(reason: unknown): Built<CustomerStatusChange> {
  const parsed = customerStatusChangeSchema.safeParse({ reason: typeof reason === "string" ? reason : "" });
  if (parsed.success) return { ok: true, payload: parsed.data };
  return { ok: false, errors: mapFields(issuesToFields(parsed.error.issues), { reason: "reason" }) };
}

export function mapProfileFields(fields: Record<string, string[]> | undefined): FieldErrors {
  return mapFields(fields, profileAliases);
}
