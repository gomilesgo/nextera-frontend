import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchFlagDetail } from "@/lib/payments/api";

export async function GET(_request: Request, { params }: RouteContext<"/api/payments/flags/[id]">): Promise<Response> {
  const { id } = await params;
  return withStaff("payments.view", async ({ token }) => {
    const result = await fetchFlagDetail(token, id);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
