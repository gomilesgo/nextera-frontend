import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { CustomerProfile } from "@nextera/contracts";
import { callBackend } from "@/lib/backend/server";
import type { BackendError } from "@/lib/backend/client";
import { toCustomerProfile } from "@/lib/customer";
import { GENERIC_MESSAGES, logServiceKeyRejected, serviceKeyRejected } from "@/lib/safeErrors";
import { safePortalPath } from "@/lib/request";
import { LOGIN_PATH, PATH_HEADER, SESSION_COOKIE, expiredPath, sessionCookieOptions } from "@/lib/sessionCookie";

export type CustomerSession =
  | { status: "signed_in"; customer: CustomerProfile; token: string }
  | { status: "anonymous" }
  | { status: "expired" }
  | { status: "blocked" }
  | { status: "error"; error: BackendError };

export type SignedIn = { customer: CustomerProfile; token: string };

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function storeSession(token: string, expiresAt: string): Promise<void> {
  const store = await cookies();
  const expires = new Date(expiresAt);
  store.set(SESSION_COOKIE, token, {
    ...sessionCookieOptions,
    expires: Number.isNaN(expires.getTime()) ? undefined : expires,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

export const getCustomerSession = cache(async (): Promise<CustomerSession> => {
  const token = await readSessionToken();
  if (!token) return { status: "anonymous" };
  const result = await callBackend<{ customer: unknown }>("/v1/auth/me", { token });
  if (!result.ok) {
    if (result.error.code === "unauthorized") {
      if (await serviceKeyRejected((path) => callBackend(path))) {
        logServiceKeyRejected("session");
        return { status: "error", error: { code: "unavailable", message: GENERIC_MESSAGES.misconfigured } };
      }
      return { status: "expired" };
    }
    if (result.error.code === "account_blocked") return { status: "blocked" };
    return { status: "error", error: result.error };
  }
  const customer = toCustomerProfile(result.data?.customer);
  if (!customer) {
    return {
      status: "error",
      error: { code: "internal", message: "The server returned an unexpected customer profile" },
    };
  }
  return { status: "signed_in", customer, token };
});

export async function requireCustomer(): Promise<SignedIn> {
  const session = await getCustomerSession();
  if (session.status === "anonymous") redirect(LOGIN_PATH);
  if (session.status === "expired") {
    const current = (await headers()).get(PATH_HEADER);
    redirect(expiredPath("session", current ? safePortalPath(current) : undefined));
  }
  if (session.status === "blocked") redirect(expiredPath("blocked"));
  if (session.status === "error") throw new Error(session.error.message);
  return { customer: session.customer, token: session.token };
}
