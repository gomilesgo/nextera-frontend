import { auditLogQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { parseSearchQuery } from "@/lib/api/searchQuery";
import { fetchAuditLog } from "@/lib/audit/api";

export async function GET(request: Request): Promise<Response> {
  return withStaff("audit.view", async ({ token }) => {
    const query = parseSearchQuery(request, auditLogQuerySchema);
    if (!query.ok) return query.response;
    const result = await fetchAuditLog(token, query.data);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
