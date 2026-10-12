import { describe, expect, it, vi } from "vitest";
import { GENERIC_MESSAGES, publicMessage, serviceKeyRejected } from "./safeErrors";

describe("publicMessage", () => {
  it("passes through only user-safe codes", () => {
    for (const code of ["otp_invalid", "otp_expired", "otp_exhausted", "validation", "rate_limited", "account_blocked", "not_found"]) {
      expect(publicMessage({ code: code as "validation", message: "backend says" })).toBe("backend says");
    }
    expect(publicMessage({ code: "unauthorized", message: "Missing or invalid service key" })).toBe(GENERIC_MESSAGES.unauthorized);
    expect(publicMessage({ code: "unavailable", message: "x" })).toBe(GENERIC_MESSAGES.unavailable);
    for (const code of ["forbidden", "internal", "conflict", "sms_failed"]) {
      expect(publicMessage({ code: code as "internal", message: "secret detail" })).toBe(GENERIC_MESSAGES.fallback);
    }
  });
});

describe("serviceKeyRejected", () => {
  it("pings the backend and reports a rejected key", async () => {
    const rejected = vi.fn(async () => ({ ok: false as const, status: 401, error: { code: "unauthorized" as const, message: "x" } }));
    const accepted = vi.fn(async () => ({ ok: true as const, status: 200, data: {} }));
    const down = vi.fn(async () => ({ ok: false as const, status: 503, error: { code: "unavailable" as const, message: "x" } }));
    expect(await serviceKeyRejected(rejected)).toBe(true);
    expect(rejected).toHaveBeenCalledWith("/v1/ping");
    expect(await serviceKeyRejected(accepted)).toBe(false);
    expect(await serviceKeyRejected(down)).toBe(false);
  });
});
