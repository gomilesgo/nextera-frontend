import { describe, expect, it, vi } from "vitest";
import type { BackendError, BackendResult } from "@/lib/backend/client";
import { RESEND_AFTER_SECONDS, initialLoginState, requestCode, verifyCode } from "./login";
import type { LoginState, PostJson } from "./login";

const CHALLENGE = "6f1c1f0e-4c1a-4f55-9a52-0d6c2b1f9a10";

function ok<T>(data: T, status = 200): BackendResult<T> {
  return { ok: true, status, data };
}

function fail(error: BackendError, status = 400): BackendResult<never> {
  return { ok: false, status, error };
}

function poster(result: BackendResult<unknown>) {
  const fn = vi.fn(async () => result);
  return { fn, post: fn as unknown as PostJson };
}

const codeStep: LoginState = {
  step: "code",
  phone: "+919876543210",
  challengeId: CHALLENGE,
  expiresAt: "2026-10-12T10:05:00.000Z",
  resendInSeconds: RESEND_AFTER_SECONDS,
  round: 1,
};

describe("requestCode", () => {
  it("normalises the number, asks the backend and moves to the code step", async () => {
    const { fn, post } = poster(ok({ challengeId: CHALLENGE, expiresAt: "2026-10-12T10:05:00.000Z" }, 201));

    const state = await requestCode({ phone: "98765 43210", previous: initialLoginState }, post);

    expect(fn).toHaveBeenCalledWith("/v1/auth/otp/request", { phone: "+919876543210" });
    expect(state).toEqual({
      step: "code",
      phone: "+919876543210",
      challengeId: CHALLENGE,
      expiresAt: "2026-10-12T10:05:00.000Z",
      resendInSeconds: RESEND_AFTER_SECONDS,
      round: 1,
      notice: "We sent a 6-digit code to +91 98•••• ••10.",
    });
  });

  it("rejects invalid numbers without calling the backend", async () => {
    const { fn, post } = poster(ok({}));

    const state = await requestCode({ phone: "12345", previous: initialLoginState }, post);

    expect(fn).not.toHaveBeenCalled();
    expect(state.step).toBe("phone");
    expect(state.phoneError).toMatch(/10-digit Indian mobile/);
  });

  it("shows the wait time when rate limited and keeps the existing code step", async () => {
    const { post } = poster(
      fail({ code: "rate_limited", message: "Too many codes sent to this number. Try again later.", retryAfterSeconds: 420 }, 429),
    );

    const state = await requestCode({ phone: "+919876543210", previous: codeStep }, post);

    expect(state.step).toBe("code");
    expect(state.challengeId).toBe(CHALLENGE);
    expect(state.resendInSeconds).toBe(420);
    expect(state.round).toBe(2);
    expect(state.error).toBe("Too many codes sent to this number. Try again later. You can try again in about 7 minutes.");
  });

  it("maps backend field errors and SMS failures", async () => {
    const invalid = await requestCode(
      { phone: "9876543210", previous: initialLoginState },
      poster(fail({ code: "validation", message: "Some fields are invalid", fields: { phone: ["Enter a valid Indian mobile number"] } })).post,
    );
    expect(invalid).toMatchObject({ step: "phone", phoneError: "Enter a valid Indian mobile number" });

    const sms = await requestCode(
      { phone: "9876543210", previous: initialLoginState },
      poster(fail({ code: "sms_failed", message: "x" }, 502)).post,
    );
    expect(sms.error).toMatch(/could not send the code/);
  });

  it("reports an unreachable backend in plain words", async () => {
    const state = await requestCode(
      { phone: "9876543210", previous: initialLoginState },
      poster(fail({ code: "unavailable", message: "Could not reach the server." }, 503)).post,
    );
    expect(state).toEqual({
      step: "phone",
      phone: "9876543210",
      error: "We could not reach Nextera just now. Please try again in a moment.",
    });
  });
});

describe("configuration and internal errors", () => {
  it("treats a rejected service key as a configuration problem and logs it loudly", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await requestCode(
      { phone: "9876543210", previous: initialLoginState },
      poster(fail({ code: "unauthorized", message: "Missing or invalid service key" }, 401)).post,
    );
    expect(state.error).toBe("Nextera is temporarily unavailable. Please try again shortly.");
    expect(errorLog).toHaveBeenCalledWith(expect.stringMatching(/otp\/request.*NEXTERA_PORTAL_SERVICE_KEY/));

    const outcome = await verifyCode(
      { phone: "+919876543210", challengeId: CHALLENGE, code: "123456", previous: codeStep },
      poster(fail({ code: "unauthorized", message: "Missing or invalid service key" }, 401)).post,
    );
    expect(outcome).toMatchObject({ state: { error: "Nextera is temporarily unavailable. Please try again shortly." } });
    expect(errorLog).toHaveBeenCalledWith(expect.stringMatching(/otp\/verify.*NEXTERA_PORTAL_SERVICE_KEY/));
    errorLog.mockRestore();
  });

  it("never shows raw backend wording for unsafe codes", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await requestCode(
      { phone: "9876543210", previous: initialLoginState },
      poster(fail({ code: "forbidden", message: "This endpoint is only available to the portal app" }, 403)).post,
    );
    expect(state.error).toBe("Something went wrong on our side. Please try again.");
    errorLog.mockRestore();
  });
});

describe("verifyCode", () => {
  const input = { phone: "+919876543210", challengeId: CHALLENGE, code: "123 456", previous: codeStep };

  it("returns the session token on success", async () => {
    const { fn, post } = poster(ok({ token: "tok", expiresAt: "2026-10-19T10:00:00.000Z", customer: {} }));

    const outcome = await verifyCode(input, post);

    expect(fn).toHaveBeenCalledWith("/v1/auth/otp/verify", { challengeId: CHALLENGE, code: "123456" });
    expect(outcome).toEqual({ kind: "signed_in", token: "tok", expiresAt: "2026-10-19T10:00:00.000Z" });
  });

  it("validates the code locally", async () => {
    const { fn, post } = poster(ok({}));

    const outcome = await verifyCode({ ...input, code: "12ab" }, post);

    expect(fn).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ kind: "state", state: { step: "code", codeError: "Enter the 6-digit code" } });
  });

  it("restarts when the challenge id is missing", async () => {
    const outcome = await verifyCode({ ...input, challengeId: "" }, poster(ok({})).post);
    expect(outcome).toMatchObject({ kind: "state", state: { step: "phone" } });
  });

  it("keeps the code step on a wrong code", async () => {
    const outcome = await verifyCode(input, poster(fail({ code: "otp_invalid", message: "That code is incorrect." })).post);
    expect(outcome).toMatchObject({
      kind: "state",
      state: { step: "code", challengeId: CHALLENGE, codeError: "That code is incorrect." },
    });
  });

  it("unlocks resend immediately when the code expired or ran out of attempts", async () => {
    for (const code of ["otp_expired", "otp_exhausted"] as const) {
      const outcome = await verifyCode(input, poster(fail({ code, message: "Request a new one." })).post);
      expect(outcome).toMatchObject({ kind: "state", state: { step: "code", resendInSeconds: 0, round: 2 } });
    }
  });

  it("sends blocked accounts back to the start", async () => {
    const outcome = await verifyCode(
      input,
      poster(fail({ code: "account_blocked", message: "This account is not active. Please contact support." }, 403)).post,
    );
    expect(outcome).toEqual({
      kind: "state",
      state: { step: "phone", phone: "+919876543210", error: "This account is not active. Please contact support." },
    });
  });

  it("treats a success without a token as a failure", async () => {
    const outcome = await verifyCode(input, poster(ok({ token: "" })).post);
    expect(outcome).toMatchObject({ kind: "state", state: { error: "Something went wrong on our side. Please try again." } });
  });
});
