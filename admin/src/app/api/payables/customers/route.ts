import type { NextRequest } from "next/server";
import { payablesCustomerListQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { parseSearch } from "@/lib/api/query";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchPayablesCustomers } from "@/lib/payables/api";

export async function GET(request: NextRequest): Promise<Response> {
  return withStaff("payables.view", async ({ token }) => {
    const query = parseSearch(payablesCustomerListQuerySchema, request.nextUrl.searchParams, [
      "cursor",
      "limit",
      "sort",
    ]);
    if (!query.ok) return query.response;
    const result = await fetchPayablesCustomers(token, query.data);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
