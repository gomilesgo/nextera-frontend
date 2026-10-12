import { planHandler } from "@/lib/api/handlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET(_request: Request, ctx: RouteContext<"/api/plans/[slug]">) {
  const { slug } = await ctx.params;
  return planHandler({ token: await readSessionToken(), call: callBackend }, slug);
}
