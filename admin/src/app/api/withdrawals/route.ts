import type { NextRequest } from "next/server";
import { adminWithdrawalQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { parseSearch } from "@/lib/api/query";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchWithdrawals } from "@/lib/withdrawals/api";

export async function GET(request: NextRequest): Promise<Response> {
  return withStaff("withdrawals.view", async ({ token }) => {
    const query = parseSearch(adminWithdrawalQuerySchema, request.nextUrl.searchParams, [
      "status",
      "customerId",
      "batchId",
      "needsReview",
      "cursor",
      "limit",
    ]);
    if (!query.ok) return query.response;
    const { status, customerId, batchId, needsReview, cursor } = query.data;
    const result = await fetchWithdrawals(token, { status, customerId, batchId, needsReview }, cursor);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
