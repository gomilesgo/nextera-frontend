import { z } from "zod";
import type { PaymentSummary } from "./payments";
import type { SchedulePeriod } from "./schedule";

export const investmentStatuses = ["pending_payment", "active", "matured", "cancelled"] as const;
export type InvestmentStatus = (typeof investmentStatuses)[number];

export const documentKinds = ["agreement", "bond", "statement"] as const;
export type DocumentKind = (typeof documentKinds)[number];

export const investmentCreateSchema = z.object({
  planSlug: z.string().trim().min(2).max(60),
  amountPaise: z.number().int().min(100, "Enter an amount of at least ₹1").max(Number.MAX_SAFE_INTEGER),
});

export const consentVerifySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

const cursorSchema = z.string().trim().min(1).max(200);

export const statementQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const adminInvestmentQuerySchema = z.object({
  status: z.enum(investmentStatuses).optional(),
  customerId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type InvestmentCreate = z.infer<typeof investmentCreateSchema>;
export type ConsentVerify = z.infer<typeof consentVerifySchema>;
export type StatementQuery = z.infer<typeof statementQuerySchema>;
export type AdminInvestmentQuery = z.infer<typeof adminInvestmentQuerySchema>;

export type InvestmentTerms = {
  planId: string;
  planSlug: string;
  planName: string;
  rateBps: number;
  tenureMonths: number;
  minPaise: number;
  maxPaise: number;
  returnsCredit: "monthly_to_wallet";
  principalRelease: "at_maturity";
  interest: "simple";
};

export type Investment = {
  id: string;
  planId: string;
  planSlug: string;
  planName: string;
  principalPaise: number;
  rateBps: number;
  tenureMonths: number;
  monthlyReturnPaise: number;
  status: InvestmentStatus;
  startDate: string | null;
  maturityDate: string | null;
  bondNo: string | null;
  consentedAt: string | null;
  activatedAt: string | null;
  maturedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

export type AdminInvestment = Investment & {
  customerId: string;
  customerName: string | null;
  terms: InvestmentTerms;
  cancelReason: string | null;
};

export type GrowthPeriod = SchedulePeriod & {
  credited: boolean;
  netPaise: number | null;
  tdsPaise: number | null;
};

export type InvestmentGrowth = {
  principalBalancePaise: number;
  creditedGrossPaise: number;
  creditedNetPaise: number;
  tdsPaise: number;
  periodsCredited: number;
  nextCreditDate: string | null;
  nextCreditPaise: number | null;
  scheduleIsIndicative: boolean;
  schedule: GrowthPeriod[];
};

export type InvestmentDocument = {
  id: string;
  kind: DocumentKind;
  investmentId: string | null;
  fileName: string;
  sha256: string;
  sizeBytes: number;
  acceptedAt: string | null;
  createdAt: string;
};

export type InvestmentDetail = {
  investment: Investment;
  growth: InvestmentGrowth;
  documents: InvestmentDocument[];
  payment: PaymentSummary | null;
};

export type InvestmentListResponse = { investments: Investment[] };

export type InvestmentCreateResponse = {
  investment: Investment;
  agreement: InvestmentDocument;
};

export type ConsentChallengeResponse = {
  challengeId: string;
  expiresAt: string;
};

export type ConsentAcceptedResponse = {
  investment: Investment;
  agreement: InvestmentDocument;
};

export type DocumentListResponse = { documents: InvestmentDocument[] };

export type StatementEntry = {
  id: string;
  transactionId: string;
  account: string;
  investmentId: string | null;
  direction: "debit" | "credit";
  amountPaise: number;
  refType: string;
  refId: string;
  memo: string;
  createdAt: string;
};

export type StatementResponse = {
  entries: StatementEntry[];
  nextCursor: string | null;
};

export type AdminInvestmentListResponse = {
  investments: AdminInvestment[];
  nextCursor: string | null;
};
