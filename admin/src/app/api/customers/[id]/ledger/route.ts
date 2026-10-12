import { customerLedgerQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { parseSearchQuery } from "@/lib/api/searchQuery";
import { fetchCustomerLedger } from "@/lib/customers/api";

export async function GET(request: Request, { params }: RouteContext<"/api/customers/[id]/ledger">): Promise<Response> {
  const { id } = await params;
  return withStaff("customers.view", async ({ token }) => {
    const query = parseSearchQuery(request, customerLedgerQuerySchema);
    if (!query.ok) return query.response;
    const result = await fetchCustomerLedger(token, id, query.data);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
