import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchTicket } from "@/lib/support/api";

export async function GET(_request: Request, { params }: RouteContext<"/api/support/tickets/[id]">): Promise<Response> {
  const { id } = await params;
  return withStaff("support.view", async ({ token }) => {
    const result = await fetchTicket(token, id);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
