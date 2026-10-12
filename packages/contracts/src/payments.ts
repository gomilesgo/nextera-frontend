import { z } from "zod";
import type { AdminInvestment, Investment, InvestmentDocument, InvestmentGrowth } from "./investments";

export const paymentStatuses = ["created", "paid", "expired", "flagged"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const paymentFlagReasons = [
  "amount_mismatch",
  "currency_mismatch",
  "unknown_order",
  "investment_not_pending",
  "customer_not_eligible",
  "paid_after_expiry",
] as const;
export type PaymentFlagReason = (typeof paymentFlagReasons)[number];

export const paymentEventSources = ["webhook", "reconcile"] as const;
export type PaymentEventSource = (typeof paymentEventSources)[number];

export const paymentActivationSources = ["webhook", "reconcile"] as const;
export type PaymentActivationSource = (typeof paymentActivationSources)[number];

export const paymentFlagResolutions = ["refunded", "posted_manually", "activated"] as const;
export type PaymentFlagResolution = (typeof paymentFlagResolutions)[number];

export const paymentFlagQuerySchema = z.object({
  state: z.enum(["open", "resolved"]).default("open"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const resolutionNote = z.string().trim().min(3, "Explain how this was resolved").max(1000);

export const paymentFlagResolveSchema = z.discriminatedUnion("resolution", [
  z.object({
    resolution: z.literal("refunded"),
    refundId: z.string().trim().min(3, "Enter the Cashfree refund id").max(100),
    note: resolutionNote,
  }),
  z.object({
    resolution: z.literal("posted_manually"),
    ledgerTransactionId: z.string().uuid("Enter the ledger transaction id"),
    note: resolutionNote,
  }),
  z.object({
    resolution: z.literal("activated"),
    note: resolutionNote,
  }),
]);

export const adminPaymentQuerySchema = z.object({
  status: z.enum(paymentStatuses).optional(),
  investmentId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type PaymentFlagQuery = z.infer<typeof paymentFlagQuerySchema>;
export type PaymentFlagResolve = z.infer<typeof paymentFlagResolveSchema>;
export type AdminPaymentQuery = z.infer<typeof adminPaymentQuerySchema>;

export type PaymentSummary = {
  id: string;
  orderId: string;
  amountPaise: number;
  status: PaymentStatus;
  gatewayStatus: string | null;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
};

export type PaymentSession = {
  payment: PaymentSummary;
  paymentSessionId: string;
  environment: "sandbox" | "production";
};

export type PaymentStatusResponse = {
  payment: PaymentSummary | null;
  investment: Investment;
};

export type AdminPayment = PaymentSummary & {
  investmentId: string;
  customerId: string;
  cfOrderId: string | null;
  cfPaymentId: string | null;
  flagReason: PaymentFlagReason | null;
  activationSource: PaymentActivationSource | null;
  lastCheckedAt: string | null;
};

export type PaymentEvent = {
  id: string;
  paymentId: string | null;
  orderId: string | null;
  source: PaymentEventSource;
  type: string;
  flagReason: PaymentFlagReason | null;
  flagDetail: string | null;
  receivedAt: string;
  processedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionType: PaymentFlagResolution | null;
  resolutionReference: string | null;
  resolutionNote: string | null;
};

export type AdminPaymentListResponse = { payments: AdminPayment[] };

export type PaymentFlagListResponse = { flags: PaymentEvent[]; total: number };

export type PaymentFlagDetailResponse = { flag: PaymentEvent; payment: AdminPayment | null };

export type AdminPaymentResponse = { payment: AdminPayment };

export type AdminInvestmentDetail = {
  investment: AdminInvestment;
  growth: InvestmentGrowth;
  payments: AdminPayment[];
  events: PaymentEvent[];
  documents: InvestmentDocument[];
};
