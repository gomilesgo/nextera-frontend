import "server-only";
import { redirect } from "next/navigation";
import { PASSWORD_CHANGE_REQUIRED } from "./client";
import type { BackendResult } from "./client";
import { callBackend } from "./server";
import { EXPIRED_PATH, PASSWORD_PATH } from "@/lib/sessionCookie";

export function unexpectedShape(what: string): BackendResult<never> {
  return { ok: false, status: 502, error: { code: "internal", message: `The server returned an unexpected ${what}` } };
}

export function checkShape<T>(
  result: BackendResult<unknown>,
  guard: (value: unknown) => value is T,
  what: string,
): BackendResult<T> {
  if (!result.ok) return result;
  return guard(result.data) ? { ok: true, status: result.status, data: result.data } : unexpectedShape(what);
}

export async function readBackend<T>(
  token: string,
  path: string,
  pick: (data: unknown) => T | null,
  what: string,
): Promise<BackendResult<T>> {
  const result = await callBackend<unknown>(path, { token });
  if (!result.ok) return result;
  const data = pick(result.data);
  if (data === null) return unexpectedShape(what);
  return { ok: true, status: result.status, data };
}

export function notFound(message: string): BackendResult<never> {
  return { ok: false, status: 404, error: { code: "not_found", message } };
}

export function unwrapForPage<T>(result: BackendResult<T>): T | null {
  if (result.ok) return result.data;
  if (result.error.code === "unauthorized") redirect(EXPIRED_PATH);
  if (result.error.code === PASSWORD_CHANGE_REQUIRED) redirect(PASSWORD_PATH);
  if (result.error.code === "not_found") return null;
  throw new Error(result.error.message);
}
