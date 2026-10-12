import { kycHandler } from "@/lib/api/handlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET() {
  return kycHandler({ token: await readSessionToken(), call: callBackend });
}
