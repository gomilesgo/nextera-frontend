import { z } from "zod";

export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const bankAccountInputSchema = z.object({
  accountNo: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\d{9,18}$/, "Enter an account number of 9 to 18 digits")),
  ifsc: z.string().trim().toUpperCase().regex(IFSC_PATTERN, "Enter a valid 11-character IFSC, for example HDFC0001234"),
});

export const bankAccountStatuses = ["pending", "verified", "failed", "review", "rejected"] as const;
export type BankAccountStatus = (typeof bankAccountStatuses)[number];

export const nameMatchResults = [
  "DIRECT_MATCH",
  "GOOD_PARTIAL_MATCH",
  "MODERATE_PARTIAL_MATCH",
  "POOR_PARTIAL_MATCH",
  "NO_MATCH",
] as const;

export const acceptedNameMatches: readonly string[] = ["DIRECT_MATCH", "GOOD_PARTIAL_MATCH"];

export const bankReviewQuerySchema = z.object({
  status: z.enum(["review", "verified", "rejected"]).default("review"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const bankRejectSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason the customer can act on").max(500),
});

export type BankAccountInput = z.infer<typeof bankAccountInputSchema>;
export type BankReviewQuery = z.infer<typeof bankReviewQuerySchema>;
export type BankReject = z.infer<typeof bankRejectSchema>;

export type BankAccount = {
  id: string;
  accountMasked: string;
  accountLast4: string;
  ifsc: string;
  holderName: string;
  nameAtBank: string | null;
  nameMatchResult: string | null;
  status: BankAccountStatus;
  isPrimary: boolean;
  verifiedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
};

export type AdminBankAccount = BankAccount & {
  customerId: string;
  nameMatchScore: string | null;
  pennyDropRef: string | null;
  failureReason: string | null;
  holdReason: string | null;
  reviewedBy: string | null;
};
