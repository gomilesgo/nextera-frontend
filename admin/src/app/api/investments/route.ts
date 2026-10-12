import type { NextRequest } from "next/server";
import { adminInvestmentQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { parseSearch } from "@/lib/api/query";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchInvestments } from "@/lib/investments/api";

export async function GET(request: NextRequest): Promise<Response> {
  return withStaff("investments.view", async ({ token }) => {
    const query = parseSearch(adminInvestmentQuerySchema, request.nextUrl.searchParams, [
      "status",
      "customerId",
      "planId",
      "cursor",
      "limit",
    ]);
    if (!query.ok) return query.response;
    const result = await fetchInvestments(token, query.data);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
