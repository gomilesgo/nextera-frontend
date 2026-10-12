import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchStaffList } from "@/lib/team/api";

export async function GET(): Promise<Response> {
  return withStaff("staff.manage", async ({ token }) => {
    const result = await fetchStaffList(token);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
