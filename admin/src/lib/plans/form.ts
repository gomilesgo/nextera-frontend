import { percentToBps, planInputSchema, planUpdateSchema, rupeesToPaise } from "@nextera/contracts";
import type { Plan, PlanInput, PlanUpdate } from "@nextera/contracts";

export const planTextFields = ["slug", "name", "description", "rate", "tenureMonths", "min", "max"] as const;

export type PlanTextField = (typeof planTextFields)[number];
export type PlanFormField = PlanTextField | "status";
export type PlanFormValues = Record<PlanTextField, string> & { status: string };
export type PlanFormErrors = Partial<Record<PlanFormField | "_", string[]>>;

export const emptyPlanValues: PlanFormValues = {
  slug: "",
  name: "",
  description: "",
  rate: "",
  tenureMonths: "",
  min: "",
  max: "",
  status: "draft",
};

const apiFieldMap: Record<string, PlanFormField> = {
  slug: "slug",
  name: "name",
  description: "description",
  rateBps: "rate",
  tenureMonths: "tenureMonths",
  minPaise: "min",
  maxPaise: "max",
  status: "status",
};

const MAX_RATE_PERCENT = 36;

export function readPlanForm(formData: FormData): PlanFormValues {
  const values = { ...emptyPlanValues };
  for (const field of planTextFields) {
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  const status = formData.get("status");
  values.status = typeof status === "string" ? status : "draft";
  return values;
}

export const MAX_RUPEE_DIGITS = 13;

export function parseDecimal(value: string): number | null {
  const cleaned = value.replace(/[,\s₹%]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function wholeDigits(value: string): number {
  return value.replace(/[,\s₹%]/g, "").split(".")[0]?.replace(/^0+(?=\d)/, "").length ?? 0;
}

function toPaise(rupees: number): number | null {
  try {
    return rupeesToPaise(rupees);
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

function parseRupees(
  raw: string,
  field: "min" | "max",
  example: string,
  errors: PlanFormErrors,
): { rupees: number; paise: number } | null {
  const rupees = parseDecimal(raw);
  if (rupees === null) {
    add(errors, field, `Enter an amount in rupees, e.g. ${example}`);
    return null;
  }
  const paise = wholeDigits(raw) > MAX_RUPEE_DIGITS ? null : toPaise(rupees);
  if (paise === null) {
    add(errors, field, "Amount is too large");
    return null;
  }
  return { rupees, paise };
}

function parseWhole(value: string): number | null {
  const cleaned = value.trim();
  if (!/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

function add(errors: PlanFormErrors, field: PlanFormField | "_", message: string) {
  (errors[field] ??= []).push(message);
}

export function mapApiFields(fields: Record<string, string[]> | undefined): PlanFormErrors {
  const errors: PlanFormErrors = {};
  for (const [key, messages] of Object.entries(fields ?? {})) {
    const field = apiFieldMap[key] ?? "_";
    for (const message of messages) add(errors, field, message);
  }
  return errors;
}

function issuesToErrors(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>) {
  const fields: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return mapApiFields(fields);
}

function parseNumbers(values: PlanFormValues, errors: PlanFormErrors) {
  const rate = parseDecimal(values.rate);
  if (rate === null) add(errors, "rate", "Enter a percentage with up to 2 decimals, e.g. 12.5");
  else if (rate <= 0 || rate > MAX_RATE_PERCENT) {
    add(errors, "rate", `Rate must be above 0% and at most ${MAX_RATE_PERCENT}%`);
  }

  const tenureMonths = parseWhole(values.tenureMonths);
  if (tenureMonths === null) add(errors, "tenureMonths", "Enter a whole number of months");
  else if (tenureMonths < 1 || tenureMonths > 120) {
    add(errors, "tenureMonths", "Tenure must be between 1 and 120 months");
  }

  const min = parseRupees(values.min, "min", "10000", errors);
  const max = parseRupees(values.max, "max", "500000", errors);

  if (min && max && max.paise < min.paise) {
    add(errors, "max", "Maximum must be at least the minimum");
  }

  return {
    rateBps: rate === null ? NaN : percentToBps(rate),
    tenureMonths: tenureMonths ?? NaN,
    minPaise: min ? min.paise : NaN,
    maxPaise: max ? max.paise : NaN,
  };
}

export type PlanPayloadResult<T> = { ok: true; payload: T } | { ok: false; errors: PlanFormErrors };

export function buildPlanInput(values: PlanFormValues): PlanPayloadResult<PlanInput> {
  const errors: PlanFormErrors = {};
  const numbers = parseNumbers(values, errors);
  if (values.status !== "draft" && values.status !== "active") {
    add(errors, "status", "Choose draft or active");
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const parsed = planInputSchema.safeParse({
    slug: values.slug,
    name: values.name,
    description: values.description,
    status: values.status,
    ...numbers,
  });
  if (!parsed.success) return { ok: false, errors: issuesToErrors(parsed.error.issues) };
  return { ok: true, payload: parsed.data };
}

export function buildPlanUpdate(
  values: PlanFormValues,
  options: { includeSlug: boolean },
): PlanPayloadResult<PlanUpdate> {
  const errors: PlanFormErrors = {};
  const numbers = parseNumbers(values, errors);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const parsed = planUpdateSchema.safeParse({
    ...(options.includeSlug ? { slug: values.slug } : {}),
    name: values.name,
    description: values.description,
    ...numbers,
  });
  if (!parsed.success) return { ok: false, errors: issuesToErrors(parsed.error.issues) };
  return { ok: true, payload: parsed.data };
}

function decimalString(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "");
}

export function planToValues(plan: Plan): PlanFormValues {
  return {
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    rate: decimalString(plan.rateBps / 100),
    tenureMonths: String(plan.tenureMonths),
    min: decimalString(plan.minPaise / 100),
    max: decimalString(plan.maxPaise / 100),
    status: plan.status,
  };
}
