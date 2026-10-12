import type { NextRequest } from "next/server";
import { paymentFlagQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { parseSearch } from "@/lib/api/query";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchFlags } from "@/lib/payments/api";

export async function GET(request: NextRequest): Promise<Response> {
  return withStaff("payments.view", async ({ token }) => {
    const query = parseSearch(paymentFlagQuerySchema, request.nextUrl.searchParams, ["state", "limit"]);
    if (!query.ok) return query.response;
    const result = await fetchFlags(token, query.data);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
