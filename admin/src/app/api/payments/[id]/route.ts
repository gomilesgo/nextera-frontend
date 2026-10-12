import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchPaymentById } from "@/lib/payments/api";

export async function GET(_request: Request, { params }: RouteContext<"/api/payments/[id]">): Promise<Response> {
  const { id } = await params;
  return withStaff("payments.view", async ({ token }) => {
    const result = await fetchPaymentById(token, id);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
