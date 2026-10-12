import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchPlans } from "@/lib/plans/api";

export async function GET(): Promise<Response> {
  return withStaff("plans.view", async ({ token }) => {
    const result = await fetchPlans(token);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
