import { z } from "zod";

export const staffRoles = ["owner", "ops", "support"] as const;
export type StaffRole = (typeof staffRoles)[number];

export const customerStatuses = ["active", "blocked", "closed"] as const;
export type CustomerStatus = (typeof customerStatuses)[number];

export const kycStatuses = ["none", "submitted", "verified", "rejected"] as const;
export type KycStatus = (typeof kycStatuses)[number];

export const otpRequestSchema = z.object({
  phone: z.string().trim().min(8, "Enter your mobile number").max(20),
});

export const otpVerifySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const staffLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
  totp: z.string().regex(/^\d{6}$/, "Enter the 6-digit authenticator code"),
});

export const customerEmailUpdateSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(254, "Email address is too long")
    .nullable(),
});

export type OtpRequest = z.infer<typeof otpRequestSchema>;
export type OtpVerify = z.infer<typeof otpVerifySchema>;
export type StaffLogin = z.infer<typeof staffLoginSchema>;
export type CustomerEmailUpdate = z.infer<typeof customerEmailUpdateSchema>;

export type CustomerProfile = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: CustomerStatus;
  kycStatus: KycStatus;
};

export type StaffProfile = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  mustChangePassword: boolean;
};

export type OtpChallengeResponse = {
  challengeId: string;
  expiresAt: string;
};

export type CustomerSessionResponse = {
  token: string;
  expiresAt: string;
  customer: CustomerProfile;
};

export type StaffSessionResponse = {
  token: string;
  expiresAt: string;
  staff: StaffProfile;
};
