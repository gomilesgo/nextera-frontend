import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchWithdrawalDetail } from "@/lib/withdrawals/api";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/withdrawals/[id]">,
): Promise<Response> {
  const { id } = await params;
  return withStaff("withdrawals.view", async ({ token }) => {
    const result = await fetchWithdrawalDetail(token, id);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
