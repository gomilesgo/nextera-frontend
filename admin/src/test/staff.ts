import { vi } from "vitest";
import type { BackendRequest, BackendResult } from "@/lib/backend/client";

type Responder = (path: string, init?: BackendRequest) => BackendResult<unknown> | undefined;

export const cookieStore = { get: vi.fn(), set: vi.fn() };
export const callBackend = vi.fn<(path: string, init?: BackendRequest) => Promise<BackendResult<unknown>>>();

export const nextHeadersMock = {
  cookies: async () => cookieStore,
  headers: async () => new Headers(),
};

export const backendServerMock = {
  callBackend: (path: string, init?: BackendRequest) => callBackend(path, init),
};

export const staffIds = {
  owner: "0e5f8a3c-9f1d-4c55-8a0e-1b2c3d4e5f60",
  ops: "1e5f8a3c-9f1d-4c55-8a0e-1b2c3d4e5f61",
  support: "2e5f8a3c-9f1d-4c55-8a0e-1b2c3d4e5f62",
} as const;

export function resetStaffMocks() {
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  callBackend.mockReset();
}

export function ok<T>(data: T, status = 200): BackendResult<T> {
  return { ok: true, status, data };
}

export function fail(code: string, message: string, status: number, fields?: Record<string, string[]>) {
  return { ok: false, status, error: { code, message, ...(fields ? { fields } : {}) } } as BackendResult<never>;
}

export function signedInAs(
  role: "owner" | "ops" | "support",
  respond: Responder = () => undefined,
  extra: Record<string, unknown> = {},
) {
  cookieStore.get.mockReturnValue({ value: "token-1" });
  callBackend.mockImplementation(async (path, init) => {
    if (path === "/v1/staff/auth/me") {
      return ok({ staff: { id: staffIds[role], email: `${role}@srahira.com`, name: role, role, ...extra } });
    }
    return respond(path, init) ?? fail("not_found", "Not found", 404);
  });
}

export function anonymous() {
  cookieStore.get.mockReturnValue(undefined);
}

export function expired() {
  cookieStore.get.mockReturnValue({ value: "stale" });
  callBackend.mockResolvedValue(fail("unauthorized", "expired", 401));
}

export function writes() {
  return callBackend.mock.calls.filter(([path]) => path !== "/v1/staff/auth/me");
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

export async function readJson(response: Response): Promise<unknown> {
  return JSON.parse(await response.text());
}
