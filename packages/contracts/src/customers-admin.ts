import { z } from "zod";
import { customerStatuses, kycStatuses } from "./auth";
import type { CustomerProfile, KycStatus } from "./auth";
import type { BankAccountStatus } from "./bank";
import { isoDateSchema } from "./kyc";

export const ADMIN_PAGE_LIMIT_DEFAULT = 50;
export const ADMIN_PAGE_LIMIT_MAX = 200;

export const adminPageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(ADMIN_PAGE_LIMIT_MAX).default(ADMIN_PAGE_LIMIT_DEFAULT),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
});

export type AdminPageQuery = z.infer<typeof adminPageQuerySchema>;

export type AdminPage<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export const customerOrigins = ["self", "admin", "lead"] as const;
export type CustomerOrigin = (typeof customerOrigins)[number];

export const blankQueryToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

export function dateRangeIsOrdered(from: string | undefined, to: string | undefined): boolean {
  return !from || !to || from <= to;
}

export const adminCustomerListQuerySchema = adminPageQuerySchema
  .extend({
    status: z.preprocess(blankQueryToUndefined, z.enum(customerStatuses).optional()),
    kycStatus: z.preprocess(blankQueryToUndefined, z.enum(kycStatuses).optional()),
    q: z.preprocess(blankQueryToUndefined, z.string().trim().max(100).optional()),
    createdFrom: z.preprocess(blankQueryToUndefined, isoDateSchema.optional()),
    createdTo: z.preprocess(blankQueryToUndefined, isoDateSchema.optional()),
  })
  .refine((query) => dateRangeIsOrdered(query.createdFrom, query.createdTo), {
    message: "The end date must not be before the start date",
    path: ["createdTo"],
  });

export type AdminCustomerListQuery = z.infer<typeof adminCustomerListQuerySchema>;

const customerNameSchema = z.string().trim().min(2, "Enter the customer's name").max(100);

const customerEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().toLowerCase().email("Enter a valid email address").max(200).nullable(),
);

const customerPhoneSchema = z.string().trim().min(8, "Enter a mobile number").max(20);

export const adminCustomerCreateSchema = z.object({
  phone: customerPhoneSchema,
  name: customerNameSchema,
  email: customerEmailSchema.optional(),
});

export const adminCustomerUpdateSchema = z
  .object({
    name: customerNameSchema.optional(),
    email: customerEmailSchema.optional(),
    phone: customerPhoneSchema.optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), { message: "Nothing to update" });

export const CUSTOMER_STATUS_REASON_MIN_LENGTH = 3;

export const customerStatusChangeSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(CUSTOMER_STATUS_REASON_MIN_LENGTH, "Give a reason for the audit trail")
    .max(500),
});

export type AdminCustomerCreate = z.infer<typeof adminCustomerCreateSchema>;
export type AdminCustomerUpdate = z.infer<typeof adminCustomerUpdateSchema>;
export type CustomerStatusChange = z.infer<typeof customerStatusChangeSchema>;

export type AdminCustomer = CustomerProfile & {
  createdVia: CustomerOrigin;
  createdAt: string;
  updatedAt: string;
};

export type AdminCustomerList = AdminPage<AdminCustomer>;

export type AdminCustomerResponse = {
  customer: AdminCustomer;
};

export type AdminCustomerKycSummary = {
  status: KycStatus;
  panMasked: string | null;
  panName: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
};

export type AdminCustomerBankSummary = {
  id: string;
  accountMasked: string;
  ifsc: string;
  holderName: string;
  status: BankAccountStatus;
  isPrimary: boolean;
  verifiedAt: string | null;
};

export type CustomerAccountBalance = {
  account: string;
  balancePaise: number;
};

export type AdminCustomerDetail = {
  customer: AdminCustomer;
  kyc: AdminCustomerKycSummary;
  bankAccounts: AdminCustomerBankSummary[];
  balances: CustomerAccountBalance[];
  totalBalancePaise: number;
};
