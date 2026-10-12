import type { NextRequest } from "next/server";
import { dispositionFrom, documentFileHandler } from "@/lib/api/investmentHandlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/documents/[id]/file">) {
  const { id } = await ctx.params;
  return documentFileHandler(
    { token: await readSessionToken(), call: callBackend },
    id,
    dispositionFrom(request.nextUrl),
  );
}
