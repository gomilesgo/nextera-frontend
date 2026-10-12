import { ticketHandler } from "@/lib/api/supportHandlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET(_request: Request, ctx: RouteContext<"/api/support/tickets/[id]">) {
  const { id } = await ctx.params;
  return ticketHandler({ token: await readSessionToken(), call: callBackend }, id);
}
