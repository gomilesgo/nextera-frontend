import type { NextRequest } from "next/server";
import { analyticsOverviewQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { parseSearch } from "@/lib/api/query";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchAnalyticsOverview } from "@/lib/analytics/api";

export async function GET(request: NextRequest): Promise<Response> {
  return withStaff("analytics.view", async ({ token }) => {
    const query = parseSearch(analyticsOverviewQuerySchema, request.nextUrl.searchParams, ["from", "to"]);
    if (!query.ok) return query.response;
    const result = await fetchAnalyticsOverview(token, query.data);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
