import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchLead } from "@/lib/leads/api";

export async function GET(_request: Request, { params }: RouteContext<"/api/leads/[id]">): Promise<Response> {
  const { id } = await params;
  return withStaff("leads.view", async ({ token }) => {
    const result = await fetchLead(token, id);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
