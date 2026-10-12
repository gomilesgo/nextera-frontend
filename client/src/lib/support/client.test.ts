import { describe, expect, it } from "vitest";
import { ApiError, authLossReason } from "@/lib/api/errors";
import { SEND_FAILED, fieldErrorsFrom, mutationNotice, unwrap } from "./client";

describe("unwrap", () => {
  it("returns data on success", async () => {
    expect(await unwrap(Promise.resolve({ ok: true as const, data: 1 }))).toBe(1);
  });

  it("throws an ApiError that the auth-loss handler recognises", async () => {
    const error = await unwrap(
      Promise.resolve({ ok: false as const, status: 401, code: "unauthorized", message: "expired" }),
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(authLossReason(error)).toBe("session");
  });

  it("carries field errors and the retry time", async () => {
    const error = await unwrap<never>(
      Promise.resolve({
        ok: false as const,
        status: 429,
        code: "rate_limited",
        message: "Limit. You can try again in about 2 hours.",
        retryAfterSeconds: 7200,
      }),
    ).catch((caught: unknown) => caught as ApiError);
    expect(error.retryAfterSeconds).toBe(7200);
    expect(mutationNotice(error)).toEqual({ title: "Limit reached", body: "Limit. You can try again in about 2 hours." });
  });
});

describe("mutationNotice", () => {
  it("stays quiet for auth loss, which redirects instead", () => {
    expect(mutationNotice(new ApiError(401, "unauthorized", "x"))).toBeNull();
    expect(mutationNotice(new ApiError(403, "account_blocked", "x"))).toBeNull();
    expect(mutationNotice(null)).toBeNull();
  });

  it("explains network failures and field errors", () => {
    expect(mutationNotice(new Error("fetch failed"))).toEqual({ title: "Not sent", body: SEND_FAILED });
    const invalid = new ApiError(400, "validation", "Please check the highlighted fields.", {
      fields: { attachment: ["Too big"], unknown: ["x"] },
    });
    expect(fieldErrorsFrom(invalid)).toEqual({ attachment: "Too big" });
    expect(mutationNotice(invalid)?.title).toBe("Please check the highlighted fields");
  });
});
