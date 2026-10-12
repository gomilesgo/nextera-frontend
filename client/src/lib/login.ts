import { otpVerifySchema } from "@nextera/contracts";
import type { CustomerSessionResponse, OtpChallengeResponse } from "@nextera/contracts";
import type { BackendError, BackendResult } from "@/lib/backend/client";
import { maskIndianMobile, normalizeIndianMobile } from "@/lib/phone";
import { GENERIC_MESSAGES, isUserSafe, logBackendError, logServiceKeyRejected, publicMessage } from "@/lib/safeErrors";

export const RESEND_AFTER_SECONDS = 30;

export type LoginState = {
  step: "phone" | "code";
  phone: string;
  challengeId?: string;
  expiresAt?: string;
  resendInSeconds?: number;
  round?: number;
  notice?: string;
  error?: string;
  phoneError?: string;
  codeError?: string;
};

export const initialLoginState: LoginState = { step: "phone", phone: "" };

export type PostJson = <T>(path: string, json: unknown) => Promise<BackendResult<T>>;

export type VerifyOutcome =
  | { kind: "signed_in"; token: string; expiresAt: string }
  | { kind: "state"; state: LoginState };

const PHONE_HINT = "Enter a 10-digit Indian mobile number, for example 98765 43210.";

function waitMessage(error: BackendError, fallback: string): string {
  const seconds = error.retryAfterSeconds;
  if (!seconds || seconds <= 0) return error.message || fallback;
  const minutes = Math.ceil(seconds / 60);
  const wait = seconds < 90 ? `${seconds} seconds` : `${minutes} minutes`;
  return `${error.message || fallback} You can try again in about ${wait}.`;
}

function genericMessage(error: BackendError, endpoint: string): string {
  if (error.code === "unauthorized") {
    logServiceKeyRejected(`login ${endpoint}`);
    return GENERIC_MESSAGES.misconfigured;
  }
  if (!isUserSafe(error.code)) logBackendError(`login ${endpoint}`, error);
  return publicMessage(error);
}

function isChallenge(value: unknown): value is OtpChallengeResponse {
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  return typeof raw.challengeId === "string" && typeof raw.expiresAt === "string";
}

function isSession(value: unknown): value is CustomerSessionResponse {
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  return typeof raw.token === "string" && raw.token.length > 0 && typeof raw.expiresAt === "string";
}

export async function requestCode(
  input: { phone: string; previous: LoginState },
  post: PostJson,
): Promise<LoginState> {
  const { previous } = input;
  const phone = normalizeIndianMobile(input.phone);
  const keep: LoginState =
    previous.step === "code" && previous.challengeId
      ? { ...previous, notice: undefined, error: undefined, codeError: undefined, phoneError: undefined }
      : { step: "phone", phone: input.phone.trim() };

  if (!phone) return { step: "phone", phone: input.phone.trim(), phoneError: PHONE_HINT };

  const result = await post<OtpChallengeResponse>("/v1/auth/otp/request", { phone });

  if (result.ok) {
    if (!isChallenge(result.data)) {
      return { ...keep, error: "Something went wrong on our side. Please try again." };
    }
    return {
      step: "code",
      phone,
      challengeId: result.data.challengeId,
      expiresAt: result.data.expiresAt,
      resendInSeconds: RESEND_AFTER_SECONDS,
      round: (previous.round ?? 0) + 1,
      notice: `We sent a 6-digit code to ${maskIndianMobile(phone)}.`,
    };
  }

  const { error } = result;
  if (error.code === "validation") {
    return { step: "phone", phone, phoneError: error.fields?.phone?.[0] ?? error.message ?? PHONE_HINT };
  }
  if (error.code === "rate_limited") {
    return {
      ...keep,
      resendInSeconds: error.retryAfterSeconds ?? keep.resendInSeconds,
      round: (previous.round ?? 0) + 1,
      error: waitMessage(error, "Too many code requests."),
    };
  }
  if (error.code === "sms_failed") {
    return { ...keep, error: "We could not send the code. Please check the number and try again shortly." };
  }
  return { ...keep, error: genericMessage(error, "otp/request") };
}

export async function verifyCode(
  input: { phone: string; challengeId: string; code: string; previous: LoginState },
  post: PostJson,
): Promise<VerifyOutcome> {
  const base: LoginState = {
    ...input.previous,
    step: "code",
    phone: input.phone,
    challengeId: input.challengeId,
    notice: undefined,
    error: undefined,
    codeError: undefined,
    phoneError: undefined,
  };

  const parsed = otpVerifySchema.safeParse({ challengeId: input.challengeId, code: input.code.replace(/\s/g, "") });
  if (!parsed.success) {
    const codeIssue = parsed.error.issues.find((issue) => issue.path[0] === "code");
    if (codeIssue) return { kind: "state", state: { ...base, codeError: codeIssue.message } };
    return {
      kind: "state",
      state: { step: "phone", phone: input.phone, error: "Your code request has expired. Please start again." },
    };
  }

  const result = await post<CustomerSessionResponse>("/v1/auth/otp/verify", parsed.data);

  if (result.ok) {
    if (!isSession(result.data)) {
      return { kind: "state", state: { ...base, error: "Something went wrong on our side. Please try again." } };
    }
    return { kind: "signed_in", token: result.data.token, expiresAt: result.data.expiresAt };
  }

  const { error } = result;
  switch (error.code) {
    case "otp_invalid":
    case "validation":
      return { kind: "state", state: { ...base, codeError: error.fields?.code?.[0] ?? error.message } };
    case "otp_expired":
    case "otp_exhausted":
      return { kind: "state", state: { ...base, resendInSeconds: 0, round: (base.round ?? 0) + 1, error: error.message } };
    case "rate_limited":
      return { kind: "state", state: { ...base, error: waitMessage(error, "Too many attempts.") } };
    case "account_blocked":
      return {
        kind: "state",
        state: { step: "phone", phone: input.phone, error: error.message },
      };
    default:
      return { kind: "state", state: { ...base, error: genericMessage(error, "otp/verify") } };
  }
}
