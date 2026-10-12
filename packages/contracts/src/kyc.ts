import { z } from "zod";
import type { CustomerProfile, KycStatus } from "./auth";
import type { AdminBankAccount } from "./bank";
import { parseIsoDate } from "./schedule";

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(PAN_PATTERN, "Enter a valid PAN, for example ABCDE1234F");

export const isoDateSchema = z
  .string()
  .trim()
  .refine((value) => {
    try {
      return parseIsoDate(value).year >= 1900;
    } catch {
      return false;
    }
  }, "Enter a valid date as YYYY-MM-DD");

export const addressSchema = z.object({
  line1: z.string().trim().min(3, "Enter your address").max(120),
  line2: z.string().trim().max(120).default(""),
  city: z.string().trim().min(2, "Enter your city").max(60),
  state: z.string().trim().min(2, "Enter your state").max(60),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code"),
});

export const KYC_CONSENT_VERSION = "kyc-2026-10";

export const consentVersionSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9.-]{0,39}$/, "Unknown consent version");

export const kycSubmitSchema = z.object({
  pan: panSchema,
  panName: z
    .string()
    .trim()
    .min(2, "Enter your name as printed on your PAN")
    .max(100)
    .regex(/^[A-Za-z][A-Za-z .'-]*$/, "Use letters, spaces, dots, hyphens and apostrophes only"),
  dob: isoDateSchema,
  address: addressSchema,
  consentVersion: z.string({ required_error: "Accept the KYC declaration to continue" }).pipe(consentVersionSchema),
});

export const kycRejectSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason the customer can act on").max(500),
});

export const kycQueueStatuses = ["submitted", "verified", "rejected"] as const;

export const kycQueueQuerySchema = z.object({
  status: z.enum(kycQueueStatuses).default("submitted"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type Address = z.infer<typeof addressSchema>;
export type KycSubmit = z.infer<typeof kycSubmitSchema>;
export type KycReject = z.infer<typeof kycRejectSchema>;
export type KycQueueQuery = z.infer<typeof kycQueueQuerySchema>;

export type KycProfile = {
  panMasked: string;
  panName: string;
  dob: string;
  address: Address;
  submittedAt: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
};

export type CustomerKycResponse = {
  kycStatus: KycStatus;
  profile: KycProfile | null;
};

export type KycQueueItem = {
  customerId: string;
  phone: string;
  name: string | null;
  kycStatus: KycStatus;
  panMasked: string;
  panName: string;
  dob: string;
  submittedAt: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
};

export type AdminCustomerKyc = {
  customer: CustomerProfile;
  kycStatus: KycStatus;
  profile: (KycProfile & { reviewedBy: string | null }) | null;
  bankAccounts: AdminBankAccount[];
};
