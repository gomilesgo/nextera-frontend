import { vi } from "vitest";
import type { BackendRequest, BackendResult } from "@/lib/backend/client";

export const cookieStore = { get: vi.fn(), set: vi.fn() };
export const incomingHeaders = { current: new Headers() };
export const callBackend = vi.fn<(path: string, init?: BackendRequest) => Promise<BackendResult<unknown>>>();

export const staffProfiles = {
  owner: { id: "s-owner", email: "owner@srahira.com", name: "Owner", role: "owner" },
  ops: { id: "s-ops", email: "ops@srahira.com", name: "Ops", role: "ops" },
  support: { id: "s-support", email: "support@srahira.com", name: "Support", role: "support" },
} as const;

export type Role = keyof typeof staffProfiles;

export type BackendRoutes = (path: string, init?: BackendRequest) => BackendResult<unknown> | undefined;

export function signedInAs(role: Role, routes: BackendRoutes = () => undefined, extra: Record<string, unknown> = {}) {
  cookieStore.get.mockReturnValue({ value: "token-1" });
  callBackend.mockImplementation(async (path, init) => {
    if (path === "/v1/staff/auth/me") {
      return { ok: true, status: 200, data: { staff: { ...staffProfiles[role], ...extra } } };
    }
    return routes(path, init) ?? { ok: false, status: 404, error: { code: "not_found", message: "Unexpected path" } };
  });
}

export function anonymous() {
  cookieStore.get.mockReturnValue(undefined);
}

export function expired() {
  cookieStore.get.mockReturnValue({ value: "stale" });
  callBackend.mockResolvedValue({ ok: false, status: 401, error: { code: "unauthorized", message: "expired" } });
}

export function backendCalls() {
  return callBackend.mock.calls.filter(([path]) => path !== "/v1/staff/auth/me");
}

export function resetHarness() {
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  callBackend.mockReset();
  incomingHeaders.current = new Headers();
}

export function ok(data: unknown, status = 200): BackendResult<unknown> {
  return { ok: true, status, data };
}

export function fail(status: number, code: string, message = code, fields?: Record<string, string[]>): BackendResult<unknown> {
  return { ok: false, status, error: { code: code as never, message, ...(fields ? { fields } : {}) } };
}

export function context<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) } as never;
}

export async function redirectTarget(promise: Promise<unknown>): Promise<string> {
  const error = (await promise.then(
    () => {
      throw new Error("expected a redirect");
    },
    (caught: unknown) => caught,
  )) as { digest?: string };
  return String(error.digest).split(";")[2] ?? "";
}
