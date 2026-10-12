import type { NextRequest } from "next/server";
import { adminTicketListQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { parseSearch } from "@/lib/api/query";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchTickets } from "@/lib/support/api";

const keys = ["status", "category", "priority", "assigneeId", "q", "cursor", "limit"] as const;

export async function GET(request: NextRequest): Promise<Response> {
  return withStaff("support.view", async ({ token }) => {
    const query = parseSearch(adminTicketListQuerySchema, request.nextUrl.searchParams, keys);
    if (!query.ok) return query.response;
    const { cursor, limit, ...params } = query.data;
    const result = await fetchTickets(token, params, cursor ?? null, limit);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
