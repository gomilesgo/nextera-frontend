import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { callBackend } from "@/lib/backend/server";
import { PASSWORD_CHANGE_REQUIRED } from "@/lib/backend/client";
import type { BackendError, BackendRequest, BackendResult } from "@/lib/backend/client";
import { can } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";
import { toAdminStaff } from "@/lib/staff";
import type { AdminStaff } from "@/lib/staff";
import {
  EXPIRED_PATH,
  LOGIN_PATH,
  PASSWORD_PATH,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/sessionCookie";

export type StaffSession =
  | { status: "signed_in"; staff: AdminStaff; token: string }
  | { status: "anonymous" }
  | { status: "expired" }
  | { status: "error"; error: BackendError };

export type SignedIn = { staff: AdminStaff; token: string };

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(sessionCookieName())?.value ?? null;
}

export async function storeSession(token: string, expiresAt: string): Promise<void> {
  const store = await cookies();
  const expires = new Date(expiresAt);
  store.set(sessionCookieName(), token, {
    ...sessionCookieOptions(),
    expires: Number.isNaN(expires.getTime()) ? undefined : expires,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.set(sessionCookieName(), "", { ...sessionCookieOptions(), maxAge: 0 });
}

export const getStaffSession = cache(async (): Promise<StaffSession> => {
  const token = await readSessionToken();
  if (!token) return { status: "anonymous" };
  const result = await callBackend<{ staff: unknown }>("/v1/staff/auth/me", { token });
  if (!result.ok) {
    if (result.error.code === "unauthorized") return { status: "expired" };
    return { status: "error", error: result.error };
  }
  const staff = toAdminStaff(result.data?.staff);
  if (!staff) {
    return {
      status: "error",
      error: { code: "internal", message: "The server returned an unexpected staff profile" },
    };
  }
  return { status: "signed_in", staff, token };
});

export async function requireStaff(options: { allowPasswordChange?: boolean } = {}): Promise<SignedIn> {
  const session = await getStaffSession();
  if (session.status === "anonymous") redirect(LOGIN_PATH);
  if (session.status === "expired") redirect(EXPIRED_PATH);
  if (session.status === "error") throw new Error(session.error.message);
  if (session.staff.mustChangePassword && !options.allowPasswordChange) redirect(PASSWORD_PATH);
  return { staff: session.staff, token: session.token };
}

export async function requirePermission(permission: Permission): Promise<SignedIn> {
  const signedIn = await requireStaff();
  if (!can(signedIn.staff.role, permission)) redirect("/");
  return signedIn;
}

export async function expireSession(): Promise<never> {
  await clearSession();
  redirect(EXPIRED_PATH);
}

export type ActionAuth = { ok: true; staff: AdminStaff; token: string } | { ok: false; message: string };

export async function authorizeAction(
  permission: Permission | null,
  options: { allowPasswordChange?: boolean } = {},
): Promise<ActionAuth> {
  const session = await getStaffSession();
  if (session.status === "anonymous") redirect(LOGIN_PATH);
  if (session.status === "expired") return expireSession();
  if (session.status === "error") return { ok: false, message: session.error.message };
  if (session.staff.mustChangePassword && !options.allowPasswordChange) redirect(PASSWORD_PATH);
  if (permission && !can(session.staff.role, permission)) {
    return { ok: false, message: "Your role does not allow this action" };
  }
  return { ok: true, staff: session.staff, token: session.token };
}

export async function staffRequest<T>(
  token: string,
  path: string,
  init: Omit<BackendRequest, "ip" | "userAgent" | "token"> = {},
): Promise<BackendResult<T>> {
  const result = await callBackend<T>(path, { ...init, token });
  if (!result.ok && result.error.code === "unauthorized") return expireSession();
  if (!result.ok && result.error.code === PASSWORD_CHANGE_REQUIRED) redirect(PASSWORD_PATH);
  return result;
}
