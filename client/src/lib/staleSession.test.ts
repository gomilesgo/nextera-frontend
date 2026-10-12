import { describe, expect, it, vi } from "vitest";
import type { BackendError, BackendResult } from "@/lib/backend/client";
import { checkStaleSession } from "./staleSession";
import type { SessionCall } from "./staleSession";

function backend(routes: Record<string, BackendResult<unknown>>) {
  const call = vi.fn(async (path: string) => {
    const result = routes[path];
    if (!result) throw new Error(`Unexpected call to ${path}`);
    return result;
  });
  return { call, session: call as unknown as SessionCall };
}

const fail = (error: BackendError, status: number): BackendResult<never> => ({ ok: false, status, error });
const ok: BackendResult<unknown> = { ok: true, status: 200, data: {} };

describe("checkStaleSession", () => {
  it("keeps a session the backend still accepts, so a forged expired link cannot sign anyone out", async () => {
    const { call, session } = backend({ "/v1/auth/me": ok });
    expect(await checkStaleSession("tok", session)).toBe("keep");
    expect(call).toHaveBeenCalledWith("/v1/auth/me", { token: "tok" });
  });

  it("clears a token the backend has expired", async () => {
    const { session } = backend({
      "/v1/auth/me": fail({ code: "unauthorized", message: "expired" }, 401),
      "/v1/ping": ok,
    });
    expect(await checkStaleSession("tok", session)).toBe("clear");
  });

  it("revokes and clears for blocked accounts", async () => {
    const { call, session } = backend({
      "/v1/auth/me": fail({ code: "account_blocked", message: "blocked" }, 403),
      "/v1/auth/logout": fail({ code: "account_blocked", message: "blocked" }, 403),
    });
    expect(await checkStaleSession("tok", session)).toBe("clear");
    expect(call).toHaveBeenCalledWith("/v1/auth/logout", { method: "POST", token: "tok" });
  });

  it("leaves the cookie alone when the backend is down or rejects the service key", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await checkStaleSession("tok", backend({ "/v1/auth/me": fail({ code: "unavailable", message: "down" }, 503) }).session),
    ).toBe("unknown");
    const rejected = fail({ code: "unauthorized", message: "Missing or invalid service key" }, 401);
    expect(await checkStaleSession("tok", backend({ "/v1/auth/me": rejected, "/v1/ping": rejected }).session)).toBe("unknown");
    expect(errorLog).toHaveBeenCalled();
    errorLog.mockRestore();
  });
});
