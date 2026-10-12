import { LEAD_LIMITS, leadCreateSchema } from "@nextera/contracts";
import type { LeadCreate, LeadCreatedResponse } from "@nextera/contracts";
import { z } from "zod";
import type { BackendResult } from "@/lib/backend/client";
import { normalizeIndianMobile } from "@/lib/phone";
import { retryAfterPhrase, retryAfterSentence } from "@/lib/retryAfter";
import { brand } from "@/lib/site";

export const ENQUIRY_HONEYPOT = "referral_note";
export const ENQUIRY_PATH = "/enquire";

export const enquiryInterests = [
  "Fixed-return plans",
  "A specific plan",
  "Investing for my family",
  "How payouts work",
  "Something else",
] as const;

export const enquiryFields = ["name", "phone", "email", "interest", "message"] as const;

export type EnquiryField = (typeof enquiryFields)[number];
export type EnquiryValues = Record<EnquiryField, string>;
export type EnquiryErrors = Partial<Record<EnquiryField, string>>;

export const emptyEnquiry: EnquiryValues = { name: "", phone: "", email: "", interest: "", message: "" };

const enquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your name")
    .max(LEAD_LIMITS.name, "Name is too long")
    .regex(/^[\p{L}][\p{L} .'-]*$/u, "Use letters, spaces, dots, hyphens and apostrophes only"),
  phone: z
    .string()
    .trim()
    .refine((value) => normalizeIndianMobile(value) !== null, "Enter a 10-digit Indian mobile number"),
  email: z
    .string()
    .trim()
    .max(LEAD_LIMITS.email, "Enter a valid email")
    .refine((value) => value === "" || z.string().email().safeParse(value).success, "Enter a valid email"),
  interest: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (enquiryInterests as readonly string[]).includes(value),
      "Choose one of the options",
    ),
  message: z.string().trim().max(LEAD_LIMITS.message, "Keep your message under 2,000 characters"),
});

export function readEnquiry(formData: FormData): EnquiryValues {
  const values = { ...emptyEnquiry };
  for (const field of enquiryFields) {
    const raw = formData.get(field);
    values[field] = typeof raw === "string" ? raw.trim() : "";
  }
  return values;
}

export type EnquiryValidation = { ok: true; lead: LeadCreate } | { ok: false; errors: EnquiryErrors };

export function validateEnquiry(values: EnquiryValues): EnquiryValidation {
  const parsed = enquirySchema.safeParse(values);
  if (!parsed.success) {
    const errors: EnquiryErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && (enquiryFields as readonly string[]).includes(key)) {
        errors[key as EnquiryField] ??= issue.message;
      }
    }
    return { ok: false, errors };
  }
  const data = parsed.data;
  const lead = leadCreateSchema.parse({
    name: data.name,
    phone: normalizeIndianMobile(data.phone),
    email: data.email || undefined,
    interest: data.interest || undefined,
    message: data.message || undefined,
    path: ENQUIRY_PATH,
  });
  return { ok: true, lead };
}

export type LeadSubmission =
  | { status: "ok"; ref: string }
  | { status: "invalid"; errors: EnquiryErrors }
  | { status: "rate_limited"; retryAfterSeconds?: number }
  | { status: "unavailable"; reason: string };

export async function submitLead(
  lead: LeadCreate,
  post: (path: string, json: unknown) => Promise<BackendResult<LeadCreatedResponse>>,
): Promise<LeadSubmission> {
  const result = await post("/v1/leads", lead);
  if (result.ok) {
    const ref = result.data && typeof result.data.ref === "string" ? result.data.ref.trim() : "";
    return ref ? { status: "ok", ref } : { status: "unavailable", reason: "missing_ref" };
  }
  const { error } = result;
  if (error.code === "validation") {
    const errors: EnquiryErrors = {};
    for (const field of enquiryFields) {
      const message = error.fields?.[field]?.[0];
      if (message) errors[field] = message;
    }
    if (Object.keys(errors).length > 0) return { status: "invalid", errors };
    return { status: "unavailable", reason: "validation_without_fields" };
  }
  if (error.code === "rate_limited" || result.status === 429) {
    return error.retryAfterSeconds === undefined
      ? { status: "rate_limited" }
      : { status: "rate_limited", retryAfterSeconds: error.retryAfterSeconds };
  }
  return { status: "unavailable", reason: `${result.status}:${error.code}` };
}

export function localLimitMessage(retryAfterSeconds: number | undefined): string {
  return `You have sent several enquiries in a short time. ${retryAfterSentence(retryAfterSeconds)}`;
}

export function backendLimitMessage(retryAfterSeconds: number | undefined): string {
  const phrase = retryAfterPhrase(retryAfterSeconds);
  const wait = phrase ? `Please try again in ${phrase}` : "Please try again later";
  return `We have had a lot of enquiries recently. ${wait}, or email us at ${brand.email}.`;
}
