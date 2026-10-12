import { adminLeadCreateSchema, adminLeadUpdateSchema, rupeesToPaise } from "@nextera/contracts";
import type { AdminLeadCreate, AdminLeadUpdate } from "@nextera/contracts";
import { issuesToFields } from "@/lib/actions/outcome";
import type { FieldErrors } from "@/lib/actions/outcome";
import { MAX_RUPEE_DIGITS, parseDecimal, wholeDigits } from "@/lib/plans/form";

export const leadFormFields = ["name", "phone", "email", "interest", "planId", "amount", "message", "notes", "assigneeId"] as const;

export type LeadFormField = (typeof leadFormFields)[number];
export type LeadFormValues = Record<LeadFormField, string>;

export const leadApiFieldMap: Record<string, string> = { amountPaise: "amount" };

export type Built<T> = { ok: true; payload: T } | { ok: false; errors: FieldErrors };

export function readLeadForm(formData: FormData): LeadFormValues {
  const values = {} as LeadFormValues;
  for (const field of leadFormFields) {
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}

function amountPaise(raw: string): { ok: true; value: number | undefined } | { ok: false; message: string } {
  if (!raw.trim()) return { ok: true, value: undefined };
  if (wholeDigits(raw) > MAX_RUPEE_DIGITS) return { ok: false, message: "Amount is too large" };
  const rupees = parseDecimal(raw);
  if (rupees === null || rupees <= 0) return { ok: false, message: "Enter an amount in rupees, like 50000" };
  try {
    return { ok: true, value: rupeesToPaise(rupees) };
  } catch {
    return { ok: false, message: "Amount is too large" };
  }
}

export function buildLeadCreate(values: LeadFormValues): Built<AdminLeadCreate> {
  const amount = amountPaise(values.amount);
  const optional = (value: string) => (value.trim() ? value : undefined);
  const parsed = adminLeadCreateSchema.safeParse({
    name: values.name,
    phone: values.phone,
    email: optional(values.email),
    interest: optional(values.interest),
    planId: optional(values.planId),
    amountPaise: amount.ok ? amount.value : undefined,
    message: optional(values.message),
    notes: optional(values.notes),
    assigneeId: optional(values.assigneeId),
  });
  const errors = parsed.success ? {} : issuesToFields(parsed.error.issues, leadApiFieldMap);
  if (!amount.ok) errors.amount = [amount.message];
  if (errors.planId) errors.planId = ["Choose a plan from the list"];
  if (errors.assigneeId) errors.assigneeId = ["Choose a staff member from the list"];
  if (!parsed.success || !amount.ok) return { ok: false, errors };
  return { ok: true, payload: parsed.data };
}

export type LeadPatchInput = {
  status?: unknown;
  notes?: unknown;
  assigneeId?: unknown;
};

export function buildLeadUpdate(input: LeadPatchInput): Built<AdminLeadUpdate> {
  const candidate: Record<string, unknown> = {};
  if (input.status !== undefined) candidate.status = input.status;
  if (input.notes !== undefined) candidate.notes = typeof input.notes === "string" && !input.notes.trim() ? null : input.notes;
  if (input.assigneeId !== undefined) candidate.assigneeId = input.assigneeId;
  const parsed = adminLeadUpdateSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, payload: parsed.data };
  const errors = issuesToFields(parsed.error.issues);
  if (errors.status) errors.status = ["Choose new, contacted, qualified or lost"];
  if (errors.assigneeId) errors.assigneeId = ["Choose a staff member from the list"];
  return { ok: false, errors };
}
