import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchPayablesSummary } from "@/lib/payables/api";

export async function GET(): Promise<Response> {
  return withStaff("payables.view", async ({ token }) => {
    const result = await fetchPayablesSummary(token);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
