import { z } from "zod";
import { adminPageQuerySchema, blankQueryToUndefined } from "./customers-admin";
import type { AdminPage } from "./customers-admin";

export const ledgerDirections = ["debit", "credit"] as const;
export type LedgerDirection = (typeof ledgerDirections)[number];

export const customerLedgerQuerySchema = adminPageQuerySchema.extend({
  account: z.preprocess(blankQueryToUndefined, z.string().trim().max(100).optional()),
});

export type CustomerLedgerQuery = z.infer<typeof customerLedgerQuerySchema>;

export type CustomerLedgerEntry = {
  id: string;
  transactionId: string;
  at: string;
  account: string;
  direction: LedgerDirection;
  amountPaise: number;
  runningBalancePaise: number;
  description: string;
  refType: string;
  refId: string;
};

export type CustomerLedgerPage = AdminPage<CustomerLedgerEntry>;

export const MANUAL_ADJUSTMENT_MAX_PAISE = 1_000_000_000;
export const MANUAL_ADJUSTMENT_REASON_MIN_LENGTH = 10;
export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";

export const adjustableAccounts = ["wallet"] as const;
export type AdjustableAccount = (typeof adjustableAccounts)[number];

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, "Use an idempotency key of at least 8 characters")
  .max(100)
  .regex(/^[A-Za-z0-9_.:-]+$/, "Use letters, numbers, dots, colons, underscores and hyphens only");

export const manualAdjustmentSchema = z.object({
  direction: z.enum(ledgerDirections),
  account: z.enum(adjustableAccounts).default("wallet"),
  amountPaise: z
    .number()
    .int("Amount must be whole paise")
    .min(1, "Amount must be above zero")
    .max(MANUAL_ADJUSTMENT_MAX_PAISE, "Amount is above the manual adjustment limit"),
  reason: z
    .string()
    .trim()
    .min(MANUAL_ADJUSTMENT_REASON_MIN_LENGTH, `Explain the adjustment in at least ${MANUAL_ADJUSTMENT_REASON_MIN_LENGTH} characters`)
    .max(500),
  idempotencyKey: idempotencyKeySchema.optional(),
});

export type ManualAdjustmentInput = z.infer<typeof manualAdjustmentSchema>;

export type ManualAdjustment = {
  transactionId: string;
  customerId: string;
  account: AdjustableAccount;
  direction: LedgerDirection;
  amountPaise: number;
  reason: string;
  idempotencyKey: string;
  createdAt: string;
};

export type ManualAdjustmentResponse = {
  adjustment: ManualAdjustment;
  balancePaise: number;
  replayed: boolean;
};

export type WalletResponse = {
  walletBalancePaise: number;
  withdrawalHoldPaise: number;
  withdrawablePaise: number;
  minWithdrawalPaise: number;
};
