import { bankAccountsHandler } from "@/lib/api/handlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET() {
  return bankAccountsHandler({ token: await readSessionToken(), call: callBackend });
}
