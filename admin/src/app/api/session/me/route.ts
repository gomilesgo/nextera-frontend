import { withStaff } from "@/lib/api/handler";
import { jsonNoStore } from "@/lib/api/respond";
import type { MeResponse } from "@/lib/queries/options";

export async function GET(): Promise<Response> {
  return withStaff(null, async ({ staff }) => {
    const body: MeResponse = { staff };
    return jsonNoStore(body);
  });
}
