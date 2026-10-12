import { withStaff } from "@/lib/api/handler";
import { errorResponse, jsonNoStore } from "@/lib/api/respond";
import { fetchSettings } from "@/lib/settings/api";

export async function GET(): Promise<Response> {
  return withStaff("settings.manage", async ({ token }) => {
    const result = await fetchSettings(token);
    if (!result.ok) return errorResponse(result.error, result.status);
    return jsonNoStore(result.data);
  });
}
