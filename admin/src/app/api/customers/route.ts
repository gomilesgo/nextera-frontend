import { adminCustomerListQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { parseSearchQuery } from "@/lib/api/searchQuery";
import { fetchCustomers } from "@/lib/customers/api";

export async function GET(request: Request): Promise<Response> {
  return withStaff("customers.view", async ({ token }) => {
    const query = parseSearchQuery(request, adminCustomerListQuerySchema);
    if (!query.ok) return query.response;
    const result = await fetchCustomers(token, query.data);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
