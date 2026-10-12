import { afterEach, describe, expect, it, vi } from "vitest";
import { formatPaise } from "@nextera/contracts";
import type { Plan } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import {
  CONSENT_RESEND_SECONDS,
  INVEST_MESSAGES,
  checkAmount,
  createIntent,
  parseCashfreeMode,
  requestConsent,
  startPayment,
  verifyConsent,
  waitText,
} from "./invest";
import type { PostJson } from "./invest";

const ID = "6f1c2a0e-3b4d-4c5e-8f90-123456789abc";
const CHALLENGE = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

const plan: Plan = {
  id: "p1",
  slug: "steady-12",
  name: "Steady 12",
  description: "",
  rateBps: 800,
  tenureMonths: 12,
  minPaise: 10_000_000,
  maxPaise: 500_000_000,
  status: "active",
  createdAt: "",
  updatedAt: "",
};

const investment = {
  id: ID,
  planId: "p1",
  planSlug: "steady-12",
  planName: "Steady 12",
  principalPaise: 135_000_000,
  rateBps: 800,
  tenureMonths: 12,
  monthlyReturnPaise: 900_000,
  status: "pending_payment",
  startDate: null,
  maturityDate: null,
  bondNo: null,
  consentedAt: null,
  activatedAt: null,
  maturedAt: null,
  cancelledAt: null,
  createdAt: "2026-10-01T04:55:00.000Z",
};

const agreement = {
  id: CHALLENGE,
  kind: "agreement",
  investmentId: ID,
  fileName: "nextera-agreement.pdf",
  sha256: "ab".repeat(32),
  sizeBytes: 100,
  acceptedAt: null,
  createdAt: "2026-10-01T04:55:00.000Z",
};

const payment = {
  id: CHALLENGE,
  orderId: "nxp_1",
  amountPaise: 135_000_000,
  status: "created",
  gatewayStatus: "ACTIVE",
  expiresAt: "2026-10-01T05:30:00.000Z",
  paidAt: null,
  createdAt: "2026-10-01T05:00:00.000Z",
};

function poster(result: BackendResult<unknown>) {
  const post = vi.fn(async () => result);
  return { post, typed: post as unknown as PostJson };
}

const noPing = async () => false;

function failure(code: string, message = "backend text", extra: Record<string, unknown> = {}): BackendResult<never> {
  return { ok: false, status: 400, error: { code, message, ...extra } as never };
}

afterEach(() => vi.restoreAllMocks());

describe("checkAmount", () => {
  it("enforces the plan minimum and maximum with contracts formatting", () => {
    expect(checkAmount("1,35,00,000", { ...plan, maxPaise: 2_000_000_000 })).toEqual({ ok: true, amountPaise: 1_350_000_000 });
    expect(checkAmount("99,999", plan)).toMatchObject({ ok: false, field: "amount", message: `The minimum for this plan is ${formatPaise(plan.minPaise)}.` });
    expect(checkAmount("50,00,001", plan)).toMatchObject({ ok: false, message: `The maximum for this plan is ${formatPaise(plan.maxPaise)}.` });
    expect(checkAmount("9".repeat(20), plan)).toMatchObject({ ok: false, field: "amount" });
    expect(checkAmount("ten lakh", plan)).toMatchObject({ ok: false, message: INVEST_MESSAGES.amountFormat });
    expect(formatPaise(plan.minPaise)).toBe("₹1,00,000");
  });
});

describe("createIntent", () => {
  const ok = { status: "ok" as const, plan };

  it("validates the slug and amount before any backend call", async () => {
    const loadPlan = vi.fn(async () => ok);
    const { post, typed } = poster({ ok: true, status: 201, data: {} });

    expect(await createIntent({ planSlug: "../admin", amount: "1,00,000" }, { loadPlan, post: typed, ping: noPing })).toMatchObject({ code: "not_found" });
    expect(await createIntent({ planSlug: "steady-12", amount: "abc" }, { loadPlan, post: typed, ping: noPing })).toMatchObject({ code: "validation", field: "amount" });
    expect(await createIntent({ planSlug: "steady-12", amount: 5 }, { loadPlan, post: typed, ping: noPing })).toMatchObject({ code: "validation" });
    expect(loadPlan).not.toHaveBeenCalled();

    expect(await createIntent({ planSlug: "steady-12", amount: "50,000" }, { loadPlan, post: typed, ping: noPing })).toMatchObject({ code: "validation", field: "amount" });
    expect(post).not.toHaveBeenCalled();
  });

  it("posts integer paise and returns the new investment id", async () => {
    const { post, typed } = poster({ ok: true, status: 201, data: { investment, agreement } });

    const result = await createIntent({ planSlug: "steady-12", amount: "₹13,50,000" }, { loadPlan: async () => ok, post: typed, ping: noPing });

    expect(post).toHaveBeenCalledWith("/v1/investments", { planSlug: "steady-12", amountPaise: 135_000_000 });
    expect(result).toEqual({ ok: true, investmentId: ID });
  });

  it("maps the KYC and bank gates to their own codes with our own wording", async () => {
    const kyc = poster(failure("kyc_not_verified", "internal detail"));
    expect(await createIntent({ planSlug: "steady-12", amount: "1,00,000" }, { loadPlan: async () => ok, post: kyc.typed, ping: noPing })).toEqual({
      ok: false,
      code: "kyc",
      message: INVEST_MESSAGES.kyc,
    });
    const bank = poster(failure("bank_account_required"));
    expect(await createIntent({ planSlug: "steady-12", amount: "1,00,000" }, { loadPlan: async () => ok, post: bank.typed, ping: noPing })).toMatchObject({ code: "bank" });
  });

  it("never passes unknown backend messages through", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = poster(failure("internal", "duplicate key value violates constraint"));
    const result = await createIntent({ planSlug: "steady-12", amount: "1,00,000" }, { loadPlan: async () => ok, post: broken.typed, ping: noPing });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).not.toMatch(/duplicate/);
  });

  it("reports an unavailable plan lookup without calling the backend", async () => {
    const { post, typed } = poster({ ok: true, status: 201, data: {} });
    const result = await createIntent({ planSlug: "steady-12", amount: "1,00,000" }, { loadPlan: async () => ({ status: "unavailable" }), post: typed, ping: noPing });
    expect(result).toMatchObject({ code: "unavailable" });
    expect(post).not.toHaveBeenCalled();
  });

  it("distinguishes an expired session from a rejected service key", async () => {
    const expired = poster(failure("unauthorized"));
    expect(await createIntent({ planSlug: "steady-12", amount: "1,00,000" }, { loadPlan: async () => ok, post: expired.typed, ping: noPing })).toMatchObject({ code: "signed_out" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createIntent({ planSlug: "steady-12", amount: "1,00,000" }, { loadPlan: async () => ok, post: expired.typed, ping: async () => true })).toMatchObject({ code: "unavailable" });
  });
});

describe("consent", () => {
  it("requests a challenge for a valid investment id only", async () => {
    const { post, typed } = poster({ ok: true, status: 201, data: { challengeId: CHALLENGE, expiresAt: "2026-10-01T05:05:00.000Z" } });
    const now = () => new Date("2026-10-01T05:00:00.000Z").getTime();

    expect(await requestConsent("not-an-id", { post: typed, ping: noPing, now })).toMatchObject({ code: "not_found" });
    expect(post).not.toHaveBeenCalled();

    expect(await requestConsent(ID, { post: typed, ping: noPing, now })).toEqual({
      ok: true,
      challengeId: CHALLENGE,
      expiresInSeconds: 300,
      resendAfterSeconds: CONSENT_RESEND_SECONDS,
    });
    expect(post).toHaveBeenCalledWith(`/v1/investments/${ID}/consent/request`);
  });

  it("explains rate limits with the wait time", async () => {
    const { typed } = poster(failure("rate_limited", "x", { retryAfterSeconds: 420 }));
    expect(await requestConsent(ID, { post: typed, ping: noPing })).toMatchObject({
      code: "rate_limited",
      retryAfterSeconds: 420,
      message: "Too many codes requested. Please try again in about 7 minutes.",
    });
    expect(waitText(45)).toBe("Please try again in 45 seconds.");
  });

  it("checks the code format before calling the backend", async () => {
    const { post, typed } = poster({ ok: true, status: 200, data: {} });

    for (const code of ["", "12345", "1234567", "12a456"]) {
      expect(await verifyConsent({ investmentId: ID, challengeId: CHALLENGE, code }, { post: typed, ping: noPing })).toMatchObject({
        code: "validation",
        field: "code",
      });
    }
    expect(await verifyConsent({ investmentId: ID, challengeId: "nope", code: "123456" }, { post: typed, ping: noPing })).toMatchObject({ code: "otp_expired" });
    expect(post).not.toHaveBeenCalled();

    expect(await verifyConsent({ investmentId: ID, challengeId: CHALLENGE, code: "123 456" }, { post: typed, ping: noPing })).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith(`/v1/investments/${ID}/consent/verify`, { challengeId: CHALLENGE, code: "123456" });
  });

  it("maps wrong, expired and exhausted codes", async () => {
    const run = (code: string) => verifyConsent({ investmentId: ID, challengeId: CHALLENGE, code: "123456" }, { post: poster(failure(code)).typed, ping: noPing });
    expect(await run("otp_invalid")).toMatchObject({ code: "otp_invalid", field: "code", message: INVEST_MESSAGES.codeInvalid });
    expect(await run("otp_expired")).toMatchObject({ code: "otp_expired", message: INVEST_MESSAGES.codeExpired });
    expect(await run("otp_exhausted")).toMatchObject({ code: "otp_exhausted", message: INVEST_MESSAGES.codeExhausted });
    expect(await run("conflict")).toMatchObject({ code: "conflict" });
  });
});

describe("startPayment", () => {
  const sessionBody = { payment, paymentSessionId: "session_abcdefgh123", environment: "sandbox" };

  it("returns only the session id and mode to the browser", async () => {
    const { post, typed } = poster({ ok: true, status: 201, data: { ...sessionBody, secret: "x" } });

    const result = await startPayment(ID, { post: typed, ping: noPing, mode: "sandbox" });

    expect(post).toHaveBeenCalledWith(`/v1/investments/${ID}/payment`);
    expect(result).toEqual({ ok: true, paymentSessionId: "session_abcdefgh123", mode: "sandbox" });
  });

  it("refuses a session from the other Cashfree environment", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { typed } = poster({ ok: true, status: 201, data: { ...sessionBody, environment: "production" } });
    expect(await startPayment(ID, { post: typed, ping: noPing, mode: "sandbox" })).toMatchObject({ code: "unavailable" });
  });

  it("does not call the backend for a bad id or a bad mode", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { post, typed } = poster({ ok: true, status: 201, data: sessionBody });
    expect(await startPayment("x", { post: typed, ping: noPing, mode: "sandbox" })).toMatchObject({ code: "not_found" });
    expect(await startPayment(ID, { post: typed, ping: noPing, mode: null })).toMatchObject({ code: "unavailable" });
    expect(post).not.toHaveBeenCalled();
  });

  it("maps consent, conflicts and gateway outages", async () => {
    const run = (result: BackendResult<never>) => startPayment(ID, { post: poster(result).typed, ping: noPing, mode: "sandbox" });
    expect(await run(failure("consent_required"))).toMatchObject({ code: "consent_required" });
    expect(await run(failure("payment_preparing"))).toMatchObject({ code: "conflict", message: INVEST_MESSAGES.preparing });
    expect(await run(failure("conflict", "anything"))).toMatchObject({ code: "conflict", message: INVEST_MESSAGES.notAwaitingPayment });
    expect(await run(failure("provider_unavailable"))).toMatchObject({ code: "gateway" });
  });

  it("parses the mode env var strictly", () => {
    expect(parseCashfreeMode(undefined)).toBe("sandbox");
    expect(parseCashfreeMode(" Production ")).toBe("production");
    expect(parseCashfreeMode("live")).toBeNull();
  });
});
