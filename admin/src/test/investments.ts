import type { AdminInvestment, AdminInvestmentDetail, AdminPayment, PaymentEvent } from "@nextera/contracts";
import { customerId } from "./fixtures";

export const investmentId = "9c4f4b1b-6f5e-4d7b-8d84-3a9b9f4b3d44";
export const planId = "ad5a5c2c-7a6f-4e8c-9e95-4bacaa5c4e55";
export const paymentId = "be6b6d3d-8b7a-4f9d-8fa6-5cbdbb6d5f66";
export const flagId = "cf7c7e4e-9c8b-4a0e-9ab7-6dcecc7e6a77";
export const documentId = "d08d8f5f-ad9c-4b1f-8bc8-7edfdd8f7b88";
export const ledgerTransactionId = "e19e9a6a-be0d-4c2a-9cd9-8fe0ee9a8c99";

export const investment: AdminInvestment = {
  id: investmentId,
  customerId,
  planId,
  planSlug: "growth-12",
  planName: "Growth 12",
  customerName: "Asha Rao",
  principalPaise: 135_000_000,
  rateBps: 1200,
  tenureMonths: 12,
  monthlyReturnPaise: 1_350_000,
  status: "active",
  startDate: "2026-10-01",
  maturityDate: "2027-10-01",
  bondNo: "NXB-2026-000001",
  consentedAt: "2026-09-30T09:00:00.000Z",
  activatedAt: "2026-10-01T05:00:00.000Z",
  maturedAt: null,
  cancelledAt: null,
  createdAt: "2026-09-30T08:55:00.000Z",
  terms: {
    planId,
    planSlug: "growth-12",
    planName: "Growth 12",
    rateBps: 1200,
    tenureMonths: 12,
    minPaise: 10_000_000,
    maxPaise: 500_000_000,
    returnsCredit: "monthly_to_wallet",
    principalRelease: "at_maturity",
    interest: "simple",
  },
  cancelReason: null,
};

export const payment: AdminPayment = {
  id: paymentId,
  orderId: "nxp_0123456789abcdef0123456789abcdef",
  amountPaise: 135_000_000,
  status: "paid",
  gatewayStatus: "PAID",
  expiresAt: "2026-09-30T09:30:00.000Z",
  paidAt: "2026-10-01T05:00:00.000Z",
  createdAt: "2026-09-30T09:00:00.000Z",
  investmentId,
  customerId,
  cfOrderId: "cf_1",
  cfPaymentId: "cfp_1",
  flagReason: null,
  activationSource: "webhook",
  lastCheckedAt: "2026-10-01T05:00:00.000Z",
};

export const flag: PaymentEvent = {
  id: flagId,
  paymentId,
  orderId: payment.orderId,
  source: "reconcile",
  type: "FLAG",
  flagReason: "amount_mismatch",
  flagDetail: "expected 135000000, order 135000000, paid 13500000",
  receivedAt: "2026-10-01T05:00:00.000Z",
  processedAt: "2026-10-01T05:00:00.000Z",
  resolvedAt: null,
  resolvedBy: null,
  resolutionType: null,
  resolutionReference: null,
  resolutionNote: null,
};

export const investmentDetail: AdminInvestmentDetail = {
  investment,
  growth: {
    principalBalancePaise: 135_000_000,
    creditedGrossPaise: 1_350_000,
    creditedNetPaise: 1_215_000,
    tdsPaise: 135_000,
    periodsCredited: 1,
    nextCreditDate: "2026-12-01",
    nextCreditPaise: 1_350_000,
    scheduleIsIndicative: false,
    schedule: [
      { periodNo: 1, dueDate: "2026-11-01", grossPaise: 1_350_000, cumulativePaise: 1_350_000, credited: true, netPaise: 1_215_000, tdsPaise: 135_000 },
      { periodNo: 2, dueDate: "2026-12-01", grossPaise: 1_350_000, cumulativePaise: 2_700_000, credited: false, netPaise: null, tdsPaise: null },
    ],
  },
  payments: [payment],
  events: [flag],
  documents: [
    {
      id: documentId,
      kind: "bond",
      investmentId,
      fileName: "bond-NXB-2026-000001.pdf",
      sha256: "a".repeat(64),
      sizeBytes: 20480,
      acceptedAt: null,
      createdAt: "2026-10-01T05:00:01.000Z",
    },
  ],
};
