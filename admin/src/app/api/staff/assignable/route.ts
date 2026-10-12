import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchAssignableStaff } from "@/lib/team/api";

export async function GET(): Promise<Response> {
  return withStaff("support.view", async ({ token }) => {
    const result = await fetchAssignableStaff(token);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
