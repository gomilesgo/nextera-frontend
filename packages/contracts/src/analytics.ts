import { z } from "zod";

export const analyticsMonthBucketSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  aum: z.number().int(),
});

export type AnalyticsMonthBucket = z.infer<typeof analyticsMonthBucketSchema>;

export const analyticsMoneyFlowBucketSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  moneyInPaise: z.number().int(),
  moneyOutPaise: z.number().int(),
});

export type AnalyticsMoneyFlowBucket = z.infer<typeof analyticsMoneyFlowBucketSchema>;

export const analyticsReturnsBucketSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  grossPaise: z.number().int(),
  tdsPaise: z.number().int(),
  netPaise: z.number().int(),
});

export type AnalyticsReturnsBucket = z.infer<typeof analyticsReturnsBucketSchema>;

export const analyticsUpcomingLiabilitiesSchema = z.object({
  returns30GrossPaise: z.number().int(),
  returns30NetPaise: z.number().int(),
  returns90GrossPaise: z.number().int(),
  returns90NetPaise: z.number().int(),
  principalMaturing30Paise: z.number().int(),
  principalMaturing90Paise: z.number().int(),
});

export type AnalyticsUpcomingLiabilities = z.infer<typeof analyticsUpcomingLiabilitiesSchema>;

export const analyticsPlanBucketSchema = z.object({
  planId: z.string().uuid(),
  planName: z.string(),
  activeCount: z.number().int(),
  activePrincipalPaise: z.number().int(),
  allTimeCount: z.number().int(),
  allTimePrincipalPaise: z.number().int(),
});

export type AnalyticsPlanBucket = z.infer<typeof analyticsPlanBucketSchema>;

export const analyticsNewCustomersBucketSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  count: z.number().int(),
});

export type AnalyticsNewCustomersBucket = z.infer<typeof analyticsNewCustomersBucketSchema>;

export const analyticsLeadConversionBucketSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  leadsCount: z.number().int(),
  convertedCount: z.number().int(),
  conversionRateBps: z.number().int(),
});

export type AnalyticsLeadConversionBucket = z.infer<typeof analyticsLeadConversionBucketSchema>;

export const analyticsOpenQueuesSchema = z.object({
  kycPending: z.number().int(),
  bankReviewPending: z.number().int(),
  withdrawalsRequested: z.number().int(),
  withdrawalsApproved: z.number().int(),
  withdrawalsNeedsReview: z.number().int(),
  supportOpen: z.number().int(),
  supportPendingCustomer: z.number().int(),
  paymentFlagsOpen: z.number().int(),
});

export type AnalyticsOpenQueues = z.infer<typeof analyticsOpenQueuesSchema>;

export const analyticsOverviewQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export type AnalyticsOverviewQuery = z.infer<typeof analyticsOverviewQuerySchema>;

export const analyticsOverviewResponseSchema = z.object({
  aumNowPaise: z.number().int(),
  aumBySeries: z.array(analyticsMonthBucketSchema),
  moneyFlowByMonth: z.array(analyticsMoneyFlowBucketSchema),
  returnsByMonth: z.array(analyticsReturnsBucketSchema),
  upcomingLiabilities: analyticsUpcomingLiabilitiesSchema,
  investmentsByPlan: z.array(analyticsPlanBucketSchema),
  newCustomersByMonth: z.array(analyticsNewCustomersBucketSchema),
  leadConversionByMonth: z.array(analyticsLeadConversionBucketSchema),
  openQueues: analyticsOpenQueuesSchema,
});

export type AnalyticsOverviewResponse = z.infer<typeof analyticsOverviewResponseSchema>;
