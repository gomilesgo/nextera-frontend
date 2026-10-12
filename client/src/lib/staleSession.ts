import type { BackendRequest, BackendResult } from "@/lib/backend/client";
import { logServiceKeyRejected, serviceKeyRejected } from "@/lib/safeErrors";

export type StaleVerdict = "clear" | "keep" | "unknown";

export type SessionCall = <T>(
  path: string,
  init?: Omit<BackendRequest, "ip" | "userAgent" | "revalidateSeconds">,
) => Promise<BackendResult<T>>;

export async function checkStaleSession(token: string, call: SessionCall): Promise<StaleVerdict> {
  const me = await call<unknown>("/v1/auth/me", { token });
  if (me.ok) return "keep";
  if (me.error.code === "account_blocked") {
    await call<void>("/v1/auth/logout", { method: "POST", token });
    return "clear";
  }
  if (me.error.code === "unauthorized") {
    if (await serviceKeyRejected((path) => call<unknown>(path))) {
      logServiceKeyRejected("proxy");
      return "unknown";
    }
    return "clear";
  }
  return "unknown";
}
