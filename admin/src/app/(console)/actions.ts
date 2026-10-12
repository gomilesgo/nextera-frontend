"use server";

import { redirect } from "next/navigation";
import { callBackend } from "@/lib/backend/server";
import { clearSession, readSessionToken } from "@/lib/session";
import { LOGIN_PATH } from "@/lib/sessionCookie";

export async function logout(): Promise<void> {
  const token = await readSessionToken();
  if (token) {
    const result = await callBackend("/v1/staff/auth/logout", { method: "POST", token });
    if (!result.ok && result.error.code !== "unauthorized") {
      console.error("[logout] backend revoke failed:", result.error.code, result.error.message);
    }
  }
  await clearSession();
  redirect(LOGIN_PATH);
}
