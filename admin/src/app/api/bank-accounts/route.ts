import type { NextRequest } from "next/server";
import { bankReviewQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { parseSearch } from "@/lib/api/query";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchBankQueue } from "@/lib/bank/api";

export async function GET(request: NextRequest): Promise<Response> {
  return withStaff("bank.review", async ({ token }) => {
    const query = parseSearch(bankReviewQuerySchema, request.nextUrl.searchParams, ["status", "limit"]);
    if (!query.ok) return query.response;
    const result = await fetchBankQueue(token, query.data);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
