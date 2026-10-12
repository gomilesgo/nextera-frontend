"use server";

import { callBackend } from "@/lib/backend/server";
import { clearSession, readSessionToken } from "@/lib/session";

export async function logoutAction(): Promise<{ ok: true }> {
  const token = await readSessionToken();
  if (token) {
    const result = await callBackend<void>("/v1/auth/logout", { method: "POST", token });
    if (!result.ok && result.error.code !== "unauthorized") {
      console.error("[logout] backend revoke failed:", result.error.code);
    }
  }
  await clearSession();
  return { ok: true };
}
