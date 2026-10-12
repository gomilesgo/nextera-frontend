import { investmentSummaryHandler } from "@/lib/api/investmentHandlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET() {
  return investmentSummaryHandler({ token: await readSessionToken(), call: callBackend });
}
