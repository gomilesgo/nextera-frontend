import type { NextRequest } from "next/server";
import { adminLeadListQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { parseSearch } from "@/lib/api/query";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchLeads } from "@/lib/leads/api";

const keys = ["status", "q", "from", "to", "assigneeId", "cursor", "limit"] as const;

export async function GET(request: NextRequest): Promise<Response> {
  return withStaff("leads.view", async ({ token }) => {
    const query = parseSearch(adminLeadListQuerySchema, request.nextUrl.searchParams, keys);
    if (!query.ok) return query.response;
    const { cursor, limit, ...params } = query.data;
    const result = await fetchLeads(token, params, cursor ?? null, limit);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
