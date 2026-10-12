import type { NextRequest } from "next/server";
import { payoutBatchQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { parseSearch } from "@/lib/api/query";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchBatches } from "@/lib/withdrawals/api";

export async function GET(request: NextRequest): Promise<Response> {
  return withStaff("withdrawals.view", async ({ token }) => {
    const query = parseSearch(payoutBatchQuerySchema, request.nextUrl.searchParams, ["cursor", "limit"]);
    if (!query.ok) return query.response;
    const result = await fetchBatches(token, query.data.cursor);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
