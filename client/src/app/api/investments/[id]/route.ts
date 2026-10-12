import { investmentHandler } from "@/lib/api/investmentHandlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET(_request: Request, ctx: RouteContext<"/api/investments/[id]">) {
  const { id } = await ctx.params;
  return investmentHandler({ token: await readSessionToken(), call: callBackend }, id);
}
