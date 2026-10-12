import type { AdminWithdrawal, AdminWithdrawalDetail, PayoutBatch, PayoutBatchDetail, Payout, PayoutEvent } from "@nextera/contracts";
import { customerId } from "./fixtures";

export const withdrawalId = "aa1b2c3d-4e5f-6789-abcd-ef0123456789";
export const batchId = "bb2c3d4e-5f6a-789b-cdef-012345678901";
export const payoutId = "cc3d4e5f-6a7b-890c-def0-123456789012";

export const withdrawal: AdminWithdrawal = {
  id: withdrawalId,
  customerId,
  amountPaise: 50_000_00,
  status: "requested",
  destination: {
    bankAccountId: "dd4e5f6a-7b8c-901d-ef01-234567890123",
    accountMasked: "XXXXXX6789",
    ifsc: "HDFC0001234",
    holderName: "Asha Rao",
  },
  rejectReason: null,
  utr: null,
  requestedAt: "2026-10-12T09:00:00.000Z",
  decidedAt: null,
  cancelledAt: null,
  paidAt: null,
  failedAt: null,
  reversedAt: null,
  decidedBy: null,
  batchId: null,
  currentPayoutId: null,
  cfTransferId: null,
  attempts: 0,
  failureReason: null,
  needsReview: false,
  unconfirmed: false,
  reviewReason: null,
  reviewResolvedAt: null,
  reviewResolvedBy: null,
  reviewNote: null,
  updatedAt: "2026-10-12T09:00:00.000Z",
};

export const payout: Payout = {
  id: payoutId,
  withdrawalId,
  attemptNo: 1,
  transferId: "nx_" + "a".repeat(37),
  cfTransferId: "cf_payout_1",
  batchId: null,
  amountPaise: 50_000_00,
  status: "processing",
  gatewayStatus: "PENDING",
  gatewayStatusCode: null,
  statusDescription: null,
  utr: null,
  initiatedBy: null,
  overrideBlocked: false,
  submittedAt: "2026-10-12T09:05:00.000Z",
  settledAt: null,
  reversedAt: null,
  lastCheckedAt: null,
  unconfirmedAt: null,
  resubmitCount: 0,
  createdAt: "2026-10-12T09:05:00.000Z",
};

export const payoutEvent: PayoutEvent = {
  id: "ee5f6a7b-8c9d-012e-f012-345678901234",
  payoutId,
  transferId: payout.transferId,
  source: "submit",
  type: "TRANSFER_ACKNOWLEDGED",
  status: "PENDING",
  flagReason: null,
  receivedAt: "2026-10-12T09:05:00.000Z",
  processedAt: "2026-10-12T09:05:01.000Z",
};

export const withdrawalDetail: AdminWithdrawalDetail = {
  withdrawal,
  payouts: [payout],
  events: [payoutEvent],
};

export const batch: PayoutBatch = {
  id: batchId,
  batchTransferId: "nxpb_" + "b".repeat(55),
  cfBatchId: null,
  createdBy: null,
  count: 1,
  totalPaise: 50_000_00,
  status: "submitted",
  gatewayStatus: null,
  failureReason: null,
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:00:00.000Z",
};

export const batchDetail: PayoutBatchDetail = {
  batch,
  withdrawals: [{ ...withdrawal, batchId, status: "processing" }],
};
