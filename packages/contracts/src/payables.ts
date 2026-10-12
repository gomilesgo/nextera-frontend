import { z } from "zod";

export const payablesSummarySchema = z.object({
  totalWalletPaise: z.number().int(),
  pendingWithdrawals: z.object({
    requestedPaise: z.number().int(),
    approvedPaise: z.number().int(),
    processingPaise: z.number().int(),
    totalPaise: z.number().int(),
  }),
  returnsDue30: z.object({
    grossPaise: z.number().int(),
    tdsPaise: z.number().int(),
    netPaise: z.number().int(),
  }),
  principalMaturing30Paise: z.number().int(),
  principalMaturing90Paise: z.number().int(),
});

export type PayablesSummary = z.infer<typeof payablesSummarySchema>;

export const payablesCustomerRowSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().nullable(),
  phoneMasked: z.string(),
  walletPaise: z.number().int(),
  pendingWithdrawalPaise: z.number().int(),
  returnsDue30: z.object({
    grossPaise: z.number().int(),
    tdsPaise: z.number().int(),
    netPaise: z.number().int(),
  }),
  principalMaturing30Paise: z.number().int(),
  principalMaturing90Paise: z.number().int(),
  totalPayablePaise: z.number().int(),
});

export type PayablesCustomerRow = z.infer<typeof payablesCustomerRowSchema>;

export const payablesCustomerListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.enum(["totalPayable_desc", "totalPayable_asc"]).default("totalPayable_desc"),
});

export type PayablesCustomerListQuery = z.infer<typeof payablesCustomerListQuerySchema>;

export const payablesCustomerListResponseSchema = z.object({
  customers: z.array(payablesCustomerRowSchema),
  nextCursor: z.string().nullable(),
});

export type PayablesCustomerListResponse = z.infer<typeof payablesCustomerListResponseSchema>;

export const payablesSummaryResponseSchema = z.object({
  summary: payablesSummarySchema,
});

export type PayablesSummaryResponse = z.infer<typeof payablesSummaryResponseSchema>;
