import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchCustomerKyc } from "@/lib/kyc/api";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/kyc/[customerId]">,
): Promise<Response> {
  const { customerId } = await params;
  return withStaff("customers.view", async ({ token }) => {
    const result = await fetchCustomerKyc(token, customerId);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
