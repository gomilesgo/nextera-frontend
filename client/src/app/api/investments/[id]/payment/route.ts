import { paymentStatusHandler } from "@/lib/api/investmentHandlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET(_request: Request, ctx: RouteContext<"/api/investments/[id]/payment">) {
  const { id } = await ctx.params;
  return paymentStatusHandler({ token: await readSessionToken(), call: callBackend }, id);
}
