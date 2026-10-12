import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchPlan } from "@/lib/plans/api";

export async function GET(_request: Request, { params }: RouteContext<"/api/plans/[id]">): Promise<Response> {
  const { id } = await params;
  return withStaff("plans.view", async ({ token }) => {
    const result = await fetchPlan(token, id);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
