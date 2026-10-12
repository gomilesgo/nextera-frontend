import "server-only";
import { analyticsOverviewResponseSchema } from "@nextera/contracts";
import type { AnalyticsOverviewQuery, AnalyticsOverviewResponse } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { readBackend, unwrapForPage } from "@/lib/backend/read";
import { toSearchString, withSearch } from "@/lib/listing/params";

export function fetchAnalyticsOverview(
  token: string,
  query: AnalyticsOverviewQuery,
): Promise<BackendResult<AnalyticsOverviewResponse>> {
  return readBackend(
    token,
    withSearch("/v1/admin/analytics/overview", toSearchString({ from: query.from, to: query.to })),
    (data) => {
      const parsed = analyticsOverviewResponseSchema.safeParse(data);
      return parsed.success ? parsed.data : null;
    },
    "analytics overview",
  );
}

const EMPTY_OVERVIEW: AnalyticsOverviewResponse = {
  aumNowPaise: 0,
  aumBySeries: [],
  moneyFlowByMonth: [],
  returnsByMonth: [],
  upcomingLiabilities: {
    returns30GrossPaise: 0,
    returns30NetPaise: 0,
    returns90GrossPaise: 0,
    returns90NetPaise: 0,
    principalMaturing30Paise: 0,
    principalMaturing90Paise: 0,
  },
  investmentsByPlan: [],
  newCustomersByMonth: [],
  leadConversionByMonth: [],
  openQueues: {
    kycPending: 0,
    bankReviewPending: 0,
    withdrawalsRequested: 0,
    withdrawalsApproved: 0,
    withdrawalsNeedsReview: 0,
    supportOpen: 0,
    supportPendingCustomer: 0,
    paymentFlagsOpen: 0,
  },
};

export async function loadAnalyticsOverview(
  token: string,
  query: AnalyticsOverviewQuery,
): Promise<AnalyticsOverviewResponse> {
  return unwrapForPage(await fetchAnalyticsOverview(token, query)) ?? EMPTY_OVERVIEW;
}
