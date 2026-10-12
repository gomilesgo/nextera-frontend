import { withdrawalsHandler } from "@/lib/api/handlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET() {
  return withdrawalsHandler({ token: await readSessionToken(), call: callBackend });
}
