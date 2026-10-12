import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchAuditEntry } from "@/lib/audit/api";

export async function GET(_request: Request, { params }: RouteContext<"/api/audit/[id]">): Promise<Response> {
  const { id } = await params;
  return withStaff("audit.view", async ({ token }) => {
    const result = await fetchAuditEntry(token, id);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
