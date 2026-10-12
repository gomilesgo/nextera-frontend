import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchInvestmentDetail } from "@/lib/investments/api";

export async function GET(_request: Request, { params }: RouteContext<"/api/investments/[id]">): Promise<Response> {
  const { id } = await params;
  return withStaff("investments.view", async ({ token }) => {
    const result = await fetchInvestmentDetail(token, id);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
