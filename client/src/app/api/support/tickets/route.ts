import type { NextRequest } from "next/server";
import { ticketsHandler } from "@/lib/api/supportHandlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  return ticketsHandler({ token: await readSessionToken(), call: callBackend }, request.nextUrl.searchParams);
}
