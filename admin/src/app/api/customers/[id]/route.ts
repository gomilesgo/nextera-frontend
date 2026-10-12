import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchCustomer } from "@/lib/customers/api";

export async function GET(_request: Request, { params }: RouteContext<"/api/customers/[id]">): Promise<Response> {
  const { id } = await params;
  return withStaff("customers.view", async ({ token }) => {
    const result = await fetchCustomer(token, id);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
