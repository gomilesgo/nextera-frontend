import { KYC_CONSENT_VERSION, addMonthsClamped, kycStatuses, kycSubmitSchema } from "@nextera/contracts";
import type { Address, CustomerKycResponse, KycProfile, KycSubmit } from "@nextera/contracts";
import { safeMaskedPan } from "./mask";
import { cleanText, readText } from "./text";

export const KYC_MIN_AGE_YEARS = 18;
export const KYC_CONSENT = KYC_CONSENT_VERSION;

export const kycFields = ["pan", "panName", "dob", "line1", "line2", "city", "state", "pincode", "consent"] as const;

export type KycField = (typeof kycFields)[number];
export type KycValues = Record<KycField, string>;
export type KycErrors = Partial<Record<KycField, string>>;

export const kycLabels: Record<KycField, string> = {
  pan: "PAN",
  panName: "Name as on PAN",
  dob: "Date of birth",
  line1: "Address line 1",
  line2: "Address line 2",
  city: "City or town",
  state: "State or union territory",
  pincode: "PIN code",
  consent: "Consent",
};

export const PAN_INPUT_MAX = 32;

export const emptyKyc: KycValues = {
  pan: "",
  panName: "",
  dob: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  consent: "",
};

export const KYC_LIMITS = {
  pan: 10,
  panName: 100,
  line1: 120,
  line2: 120,
  city: 60,
  state: 60,
  pincode: 6,
} as const;

export const indianStates = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

const CONSENT_MESSAGE = "Confirm that these details are yours and that we may verify them";
const STATE_MESSAGE = "Choose your state or union territory";

const addressFieldByPath: Record<string, KycField> = {
  "address.line1": "line1",
  "address.line2": "line2",
  "address.city": "city",
  "address.state": "state",
  "address.pincode": "pincode",
};

function fieldForPath(path: string): KycField | null {
  if (path in addressFieldByPath) return addressFieldByPath[path] ?? null;
  return path === "pan" || path === "panName" || path === "dob" ? path : null;
}

export function readKycForm(formData: FormData): KycValues {
  const values = { ...emptyKyc };
  for (const field of kycFields) values[field] = readText(formData, field);
  values.pan = normalizePan(values.pan);
  values.pincode = values.pincode.replace(/\s/g, "");
  return values;
}

export function normalizePan(raw: string): string {
  return cleanText(raw).replace(/\s/g, "").toUpperCase();
}

export function latestAdultDob(today: string): string {
  return addMonthsClamped(today, -KYC_MIN_AGE_YEARS * 12);
}

export function dobProblem(dob: string, today: string): string | null {
  if (dob > today) return "Date of birth cannot be in the future";
  if (addMonthsClamped(dob, KYC_MIN_AGE_YEARS * 12) > today) {
    return `You must be at least ${KYC_MIN_AGE_YEARS} years old to invest`;
  }
  return null;
}

export type KycValidation = { ok: true; payload: KycSubmit } | { ok: false; errors: KycErrors };

export function validateKyc(values: KycValues, today: string): KycValidation {
  const errors: KycErrors = {};
  const parsed = kycSubmitSchema.safeParse({
    pan: values.pan,
    panName: values.panName,
    dob: values.dob,
    address: {
      line1: values.line1,
      line2: values.line2,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
    },
    consentVersion: KYC_CONSENT_VERSION,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = fieldForPath(issue.path.map(String).join("."));
      if (field) errors[field] ??= issue.message;
    }
  }
  if (!(indianStates as readonly string[]).includes(values.state)) errors.state = STATE_MESSAGE;
  if (!errors.dob && parsed.success) {
    const problem = dobProblem(parsed.data.dob, today);
    if (problem) errors.dob = problem;
  }
  if (values.consent !== "yes") errors.consent = CONSENT_MESSAGE;
  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, payload: { ...parsed.data, consentVersion: KYC_CONSENT } };
}

export function mapKycFields(fields: Record<string, string[]> | undefined): KycErrors {
  const errors: KycErrors = {};
  for (const [path, messages] of Object.entries(fields ?? {})) {
    const field = fieldForPath(path);
    const message = messages[0];
    if (field && message) errors[field] ??= message;
  }
  return errors;
}

export function kycFormDefaults(profile: PortalKycProfile | null): KycValues {
  if (!profile?.address || !profile.dob) return { ...emptyKyc, panName: profile?.panName ?? "" };
  return {
    ...emptyKyc,
    panName: profile.panName,
    dob: profile.dob,
    line1: profile.address.line1,
    line2: profile.address.line2,
    city: profile.address.city,
    state: profile.address.state,
    pincode: profile.address.pincode,
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableText(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : undefined;
}

function toAddress(raw: unknown): Address | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const line1 = text(value.line1);
  const city = text(value.city);
  const state = text(value.state);
  const pincode = text(value.pincode);
  if (line1 === null || city === null || state === null || pincode === null) return null;
  return { line1, line2: text(value.line2) ?? "", city, state, pincode };
}

export function toKycProfile(raw: unknown): KycProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const panMasked = safeMaskedPan(value.panMasked);
  const address = toAddress(value.address);
  const verifiedAt = nullableText(value.verifiedAt);
  const rejectionReason = nullableText(value.rejectionReason);
  if (
    !panMasked ||
    !address ||
    typeof value.panName !== "string" ||
    typeof value.dob !== "string" ||
    typeof value.submittedAt !== "string" ||
    verifiedAt === undefined ||
    rejectionReason === undefined
  ) {
    return null;
  }
  return {
    panMasked,
    panName: value.panName,
    dob: value.dob,
    address,
    submittedAt: value.submittedAt,
    verifiedAt,
    rejectionReason,
  };
}

export function toKycResponse(raw: unknown): CustomerKycResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.kycStatus !== "string" || !(kycStatuses as readonly string[]).includes(value.kycStatus)) return null;
  const kycStatus = value.kycStatus as CustomerKycResponse["kycStatus"];
  if (value.profile === null || value.profile === undefined) return { kycStatus, profile: null };
  const profile = toKycProfile(value.profile);
  return profile ? { kycStatus, profile } : null;
}

export function canSubmitKyc(status: CustomerKycResponse["kycStatus"]): boolean {
  return status === "none" || status === "rejected";
}

export type PortalKycProfile = Omit<KycProfile, "dob" | "address"> & { dob: string | null; address: Address | null };
export type PortalKyc = { kycStatus: CustomerKycResponse["kycStatus"]; profile: PortalKycProfile | null };

export function toPortalKyc(kyc: CustomerKycResponse): PortalKyc {
  if (!kyc.profile || canSubmitKyc(kyc.kycStatus)) return kyc;
  return { kycStatus: kyc.kycStatus, profile: { ...kyc.profile, dob: null, address: null } };
}
