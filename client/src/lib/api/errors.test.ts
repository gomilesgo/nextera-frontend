import { describe, expect, it } from "vitest";
import { ApiError, MAX_READ_RETRIES, authLossReason, readApiError, shouldRetryRead } from "./errors";

describe("shouldRetryRead", () => {
  it("never retries client errors", () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429]) {
      expect(shouldRetryRead(0, new ApiError(status, "x", "x"))).toBe(false);
    }
  });

  it("retries server, network and unknown errors up to the cap", () => {
    for (const error of [new ApiError(500, "internal", "x"), new ApiError(0, "unavailable", "x"), new Error("boom")]) {
      expect(shouldRetryRead(0, error)).toBe(true);
      expect(shouldRetryRead(MAX_READ_RETRIES, error)).toBe(false);
    }
  });
});

describe("authLossReason", () => {
  it("distinguishes expired sessions, blocked accounts and other errors", () => {
    expect(authLossReason(new ApiError(401, "unauthorized", "x"))).toBe("session");
    expect(authLossReason(new ApiError(403, "account_blocked", "x"))).toBe("blocked");
    expect(authLossReason(new ApiError(403, "forbidden", "x"))).toBeNull();
    expect(authLossReason(new Error("x"))).toBeNull();
  });
});

describe("readApiError", () => {
  it("reads the error envelope", async () => {
    const error = await readApiError(
      Response.json({ error: { code: "not_found", message: "Plan not found" } }, { status: 404 }),
    );
    expect(error).toMatchObject({ status: 404, code: "not_found", message: "Plan not found" });
  });

  it("carries field errors and retry hints", async () => {
    const error = await readApiError(
      Response.json(
        { error: { code: "validation", message: "Some fields are invalid", fields: { phone: ["Bad"], junk: [1] } } },
        { status: 400 },
      ),
    );
    expect(error.fields).toEqual({ phone: ["Bad"] });

    const limited = await readApiError(
      Response.json({ error: { code: "rate_limited", message: "Slow down" } }, { status: 429, headers: { "retry-after": "30" } }),
    );
    expect(limited.retryAfterSeconds).toBe(30);
    const inBody = await readApiError(
      Response.json({ error: { code: "rate_limited", message: "Slow down", retryAfterSeconds: 12 } }, { status: 429 }),
    );
    expect(inBody.retryAfterSeconds).toBe(12);
  });

  it("falls back when the body is not an envelope", async () => {
    expect(await readApiError(new Response("<html>", { status: 502 }))).toMatchObject({ status: 502, code: "unavailable" });
    expect(await readApiError(new Response("nope", { status: 400 }))).toMatchObject({ status: 400, code: "internal" });
  });
});
