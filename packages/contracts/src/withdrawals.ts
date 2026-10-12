import { z } from "zod";

export const withdrawalStatuses = [
  "requested",
  "approved",
  "processing",
  "paid",
  "rejected",
  "cancelled",
  "failed",
  "reversed",
] as const;
export type WithdrawalStatus = (typeof withdrawalStatuses)[number];

export const openWithdrawalStatuses = ["requested", "approved", "processing"] as const;

export const payoutStatuses = ["processing", "success", "failed", "reversed"] as const;
export type PayoutStatus = (typeof payoutStatuses)[number];

export const payoutBatchStatuses = ["created", "submitted", "failed", "unconfirmed"] as const;
export type PayoutBatchStatus = (typeof payoutBatchStatuses)[number];

export const payoutEventSources = ["webhook", "sync", "submit", "staff"] as const;
export type PayoutEventSource = (typeof payoutEventSources)[number];

export const WITHDRAWAL_MAX_OPEN = 5;
export const WITHDRAWAL_DAILY_LIMIT = 20;
export const WITHDRAWAL_BULK_MAX = 100;
export const PAYOUT_BATCH_MAX = 500;

const cursorSchema = z.string().trim().min(1).max(200);
const limitSchema = z.coerce.number().int().min(1).max(200).default(50);
const reasonSchema = z.string().trim().min(5, "Give a reason of at least 5 characters").max(500);

export const withdrawalCreateSchema = z.object({
  amountPaise: z.number().int("Amount must be whole paise").min(100, "Enter an amount of at least ₹1").max(Number.MAX_SAFE_INTEGER),
});

export const withdrawalListQuerySchema = z.object({
  status: z.enum(withdrawalStatuses).optional(),
  cursor: cursorSchema.optional(),
  limit: limitSchema,
});

export const adminWithdrawalQuerySchema = z.object({
  status: z.enum(withdrawalStatuses).optional(),
  customerId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  needsReview: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  cursor: cursorSchema.optional(),
  limit: limitSchema,
});

export const payoutBatchQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: limitSchema,
});

const idList = (max: number) =>
  z
    .array(z.string().uuid())
    .min(1, "Choose at least one withdrawal")
    .max(max, `Choose at most ${max} withdrawals`)
    .refine((ids) => new Set(ids).size === ids.length, { message: "Each withdrawal may appear only once" });

export const withdrawalRejectSchema = z.object({ reason: reasonSchema });

export const withdrawalBulkApproveSchema = z.object({ ids: idList(WITHDRAWAL_BULK_MAX) });

export const withdrawalBulkRejectSchema = z.object({ ids: idList(WITHDRAWAL_BULK_MAX), reason: reasonSchema });

const overrideFields = {
  overrideBlocked: z.boolean().default(false),
  overrideReason: z.string().trim().min(10, "Explain the override in at least 10 characters").max(500).optional(),
};

function overrideNeedsReason(value: { overrideBlocked: boolean; overrideReason?: string }): boolean {
  return !value.overrideBlocked || Boolean(value.overrideReason);
}

const overrideRefinement = {
  message: "Explain why a blocked customer is being paid",
  path: ["overrideReason"],
};

export const withdrawalPaySchema = z.object(overrideFields).refine(overrideNeedsReason, overrideRefinement);

export const payoutBatchCreateSchema = z
  .object({
    ids: idList(PAYOUT_BATCH_MAX),
    overrideWithdrawalIds: z
      .array(z.string().uuid())
      .max(PAYOUT_BATCH_MAX)
      .refine((ids) => new Set(ids).size === ids.length, { message: "Each overridden withdrawal may appear only once" })
      .default([]),
    overrideReason: overrideFields.overrideReason,
  })
  .refine((value) => value.overrideWithdrawalIds.every((id) => value.ids.includes(id)), {
    message: "Every overridden withdrawal must be in the batch",
    path: ["overrideWithdrawalIds"],
  })
  .refine((value) => value.overrideWithdrawalIds.length === 0 || Boolean(value.overrideReason), overrideRefinement);

export const payoutMarkFailedSchema = z.object({
  reason: z.string().trim().min(10, "Explain how you confirmed the transfer was never sent").max(500),
});

export const withdrawalReviewResolveSchema = z.object({
  note: z.string().trim().min(5, "Explain how this was resolved").max(1000),
});

export type WithdrawalCreate = z.infer<typeof withdrawalCreateSchema>;
export type WithdrawalListQuery = z.infer<typeof withdrawalListQuerySchema>;
export type AdminWithdrawalQuery = z.infer<typeof adminWithdrawalQuerySchema>;
export type PayoutBatchQuery = z.infer<typeof payoutBatchQuerySchema>;
export type WithdrawalReject = z.infer<typeof withdrawalRejectSchema>;
export type WithdrawalBulkApprove = z.infer<typeof withdrawalBulkApproveSchema>;
export type WithdrawalBulkReject = z.infer<typeof withdrawalBulkRejectSchema>;
export type WithdrawalPay = z.infer<typeof withdrawalPaySchema>;
export type PayoutBatchCreate = z.infer<typeof payoutBatchCreateSchema>;
export type PayoutMarkFailed = z.infer<typeof payoutMarkFailedSchema>;
export type WithdrawalReviewResolve = z.infer<typeof withdrawalReviewResolveSchema>;

export type WithdrawalDestination = {
  bankAccountId: string;
  accountMasked: string;
  ifsc: string;
  holderName: string;
};

export type Withdrawal = {
  id: string;
  amountPaise: number;
  status: WithdrawalStatus;
  destination: WithdrawalDestination;
  rejectReason: string | null;
  utr: string | null;
  requestedAt: string;
  decidedAt: string | null;
  cancelledAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  reversedAt: string | null;
};

export type AdminWithdrawal = Withdrawal & {
  customerId: string;
  decidedBy: string | null;
  batchId: string | null;
  currentPayoutId: string | null;
  cfTransferId: string | null;
  attempts: number;
  failureReason: string | null;
  needsReview: boolean;
  unconfirmed: boolean;
  reviewReason: string | null;
  reviewResolvedAt: string | null;
  reviewResolvedBy: string | null;
  reviewNote: string | null;
  updatedAt: string;
};

export type Payout = {
  id: string;
  withdrawalId: string;
  attemptNo: number;
  transferId: string;
  cfTransferId: string | null;
  batchId: string | null;
  amountPaise: number;
  status: PayoutStatus;
  gatewayStatus: string | null;
  gatewayStatusCode: string | null;
  statusDescription: string | null;
  utr: string | null;
  initiatedBy: string | null;
  overrideBlocked: boolean;
  submittedAt: string | null;
  settledAt: string | null;
  reversedAt: string | null;
  lastCheckedAt: string | null;
  unconfirmedAt: string | null;
  resubmitCount: number;
  createdAt: string;
};

export type PayoutEvent = {
  id: string;
  payoutId: string | null;
  transferId: string | null;
  source: PayoutEventSource;
  type: string;
  status: string | null;
  flagReason: string | null;
  receivedAt: string;
  processedAt: string | null;
};

export type PayoutBatch = {
  id: string;
  batchTransferId: string;
  cfBatchId: string | null;
  createdBy: string | null;
  count: number;
  totalPaise: number;
  status: PayoutBatchStatus;
  gatewayStatus: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WithdrawalResponse = { withdrawal: Withdrawal };

export type WithdrawalCreateResponse = { withdrawal: Withdrawal; replayed: boolean };

export type WithdrawalListResponse = { withdrawals: Withdrawal[]; nextCursor: string | null };

export type AdminWithdrawalResponse = { withdrawal: AdminWithdrawal };

export type AdminWithdrawalListResponse = { withdrawals: AdminWithdrawal[]; nextCursor: string | null };

export type AdminWithdrawalDetail = {
  withdrawal: AdminWithdrawal;
  payouts: Payout[];
  events: PayoutEvent[];
};

export type WithdrawalItemResult =
  | { id: string; ok: true; withdrawal: AdminWithdrawal }
  | { id: string; ok: false; error: { code: string; message: string } };

export type WithdrawalBulkResponse = {
  results: WithdrawalItemResult[];
  succeeded: number;
  failed: number;
};

export type PayoutBatchResponse = WithdrawalBulkResponse & { batch: PayoutBatch | null };

export type PayoutBatchListResponse = { batches: PayoutBatch[]; nextCursor: string | null };

export type PayoutBatchDetail = { batch: PayoutBatch; withdrawals: AdminWithdrawal[] };
