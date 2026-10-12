import type { NextRequest } from "next/server";
import { statementsHandler } from "@/lib/api/investmentHandlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  return statementsHandler({ token: await readSessionToken(), call: callBackend }, request.nextUrl.searchParams.get("cursor"));
}
