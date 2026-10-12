import type { NextRequest } from "next/server";
import { dispositionFrom, investmentFileHandler } from "@/lib/api/investmentHandlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/investments/[id]/bond">) {
  const { id } = await ctx.params;
  return investmentFileHandler(
    { token: await readSessionToken(), call: callBackend },
    id,
    "bond",
    dispositionFrom(request.nextUrl),
  );
}
