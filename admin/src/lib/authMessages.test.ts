import { describe, expect, it } from "vitest";
import { formatWait, loginErrorMessage } from "./authMessages";

describe("formatWait", () => {
  it("rounds up to seconds or minutes", () => {
    expect(formatWait(1)).toBe("1 second");
    expect(formatWait(42.2)).toBe("43 seconds");
    expect(formatWait(60)).toBe("1 minute");
    expect(formatWait(61)).toBe("2 minutes");
    expect(formatWait(900)).toBe("15 minutes");
  });

  it("falls back when the hint is missing", () => {
    expect(formatWait(undefined)).toBe("a few minutes");
    expect(formatWait(0)).toBe("a few minutes");
  });
});

describe("loginErrorMessage", () => {
  it("explains lockouts and rate limits with the wait time", () => {
    expect(loginErrorMessage({ code: "account_locked", message: "x", retryAfterSeconds: 840 })).toBe(
      "Too many failed attempts. This account is locked. Try again in 14 minutes.",
    );
    expect(loginErrorMessage({ code: "rate_limited", message: "x", retryAfterSeconds: 30 })).toBe(
      "Too many sign-in attempts from this connection. Try again in 30 seconds.",
    );
  });

  it("keeps credential failures generic", () => {
    expect(loginErrorMessage({ code: "unauthorized", message: "anything" })).toBe(
      "Email, password or code is incorrect.",
    );
  });

  it("passes through connectivity messages and hides internal ones", () => {
    expect(loginErrorMessage({ code: "unavailable", message: "Could not reach the server." })).toBe(
      "Could not reach the server.",
    );
    expect(loginErrorMessage({ code: "internal", message: "stack trace" })).toBe(
      "Sign-in failed. Please try again.",
    );
  });
});
