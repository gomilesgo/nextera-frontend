import type { NextRequest } from "next/server";
import { kycQueueQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { parseSearch } from "@/lib/api/query";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchKycQueue } from "@/lib/kyc/api";

export async function GET(request: NextRequest): Promise<Response> {
  return withStaff("kyc.view", async ({ token }) => {
    const query = parseSearch(kycQueueQuerySchema, request.nextUrl.searchParams, ["status", "limit"]);
    if (!query.ok) return query.response;
    const result = await fetchKycQueue(token, query.data);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
