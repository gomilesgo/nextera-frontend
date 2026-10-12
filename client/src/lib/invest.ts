import { consentVerifySchema, formatPaise, investmentCreateSchema } from "@nextera/contracts";
import type {
  ConsentChallengeResponse,
  InvestmentCreateResponse,
  PaymentSession,
  Plan,
} from "@nextera/contracts";
import type { BackendError, BackendResult } from "@/lib/backend/client";
import { TOO_LARGE, parseRupeesInput } from "@/lib/calculator";
import { isUuid, toDocument, toInvestment, toPaymentSummary } from "@/lib/investments";
import { retryAfterSentence } from "@/lib/retryAfter";
import { GENERIC_MESSAGES, logBackendError, logServiceKeyRejected } from "@/lib/safeErrors";

export const CONSENT_RESEND_SECONDS = 30;

export type CashfreeMode = "sandbox" | "production";

export type InvestFailureCode =
  | "validation"
  | "kyc"
  | "bank"
  | "signed_out"
  | "blocked"
  | "rate_limited"
  | "otp_invalid"
  | "otp_expired"
  | "otp_exhausted"
  | "sms_failed"
  | "conflict"
  | "consent_required"
  | "gateway"
  | "not_found"
  | "unavailable";

export type InvestFailure = {
  ok: false;
  code: InvestFailureCode;
  message: string;
  field?: "amount" | "code";
  retryAfterSeconds?: number;
};

export type CreateIntentResult = { ok: true; investmentId: string } | InvestFailure;
export type ConsentRequestResult =
  | { ok: true; challengeId: string; expiresInSeconds: number; resendAfterSeconds: number }
  | InvestFailure;
export type ConsentVerifyResult = { ok: true } | InvestFailure;
export type StartPaymentResult = { ok: true; paymentSessionId: string; mode: CashfreeMode } | InvestFailure;

export type PlanLookup = { status: "ok"; plan: Plan } | { status: "not_found" } | { status: "unavailable" };

export type PostJson = <T>(path: string, json?: unknown) => Promise<BackendResult<T>>;
export type Ping = () => Promise<boolean>;

export const INVEST_MESSAGES = {
  kyc: "Your KYC must be verified before you invest.",
  bank: "Add and verify a primary bank account before you invest.",
  blocked: "This account is not active. Please contact support.",
  signedOut: GENERIC_MESSAGES.unauthorized,
  tooManyPending: "You have several unpaid investments. Complete one, or wait for it to lapse, before starting another.",
  notAwaitingConsent: "This agreement has already been accepted or is no longer open.",
  notAwaitingPayment: "This investment is no longer awaiting payment.",
  preparing: "Your payment is being prepared. Try again in a moment.",
  consentRequired: "Accept the agreement with the code we send you before paying.",
  gateway: "We could not reach the payment gateway. Please try again shortly.",
  notFound: "We could not find this investment.",
  planNotFound: "This plan is not open for investment right now.",
  codeInvalid: "That code is not valid. Check the SMS, or request a new code.",
  codeExpired: "This code has expired. Request a new one.",
  codeExhausted: "Too many wrong attempts. Request a new code.",
  smsFailed: "We could not send the code. Please try again shortly.",
  codeFormat: "Enter the 6-digit code from the SMS.",
  sessionLost: "Your code request has expired. Request a new code.",
  amountFormat: "Enter an amount in rupees, for example 1,00,000.",
} as const;

function fail(code: InvestFailureCode, message: string, extra: Partial<InvestFailure> = {}): InvestFailure {
  return { ok: false, code, message, ...extra };
}

export function waitText(seconds: number | undefined): string {
  return retryAfterSentence(seconds);
}

async function common(error: BackendError, context: string, ping: Ping): Promise<InvestFailure> {
  switch (error.code) {
    case "unauthorized":
      if (await ping()) {
        logServiceKeyRejected(context);
        return fail("unavailable", GENERIC_MESSAGES.misconfigured);
      }
      return fail("signed_out", INVEST_MESSAGES.signedOut);
    case "account_blocked":
    case "customer_inactive":
    case "customer_closed":
      return fail("blocked", INVEST_MESSAGES.blocked);
    case "kyc_not_verified":
      return fail("kyc", INVEST_MESSAGES.kyc);
    case "bank_account_required":
      return fail("bank", INVEST_MESSAGES.bank);
    case "not_found":
      return fail("not_found", INVEST_MESSAGES.notFound);
    case "rate_limited":
      return fail("rate_limited", `Too many requests. ${waitText(error.retryAfterSeconds)}`, {
        retryAfterSeconds: error.retryAfterSeconds,
      });
    case "unavailable":
      return fail("unavailable", GENERIC_MESSAGES.unavailable);
    default:
      logBackendError(context, error);
      return fail("unavailable", GENERIC_MESSAGES.fallback);
  }
}

export type AmountCheck = { ok: true; amountPaise: number } | InvestFailure;

export function checkAmount(text: string, plan: Pick<Plan, "minPaise" | "maxPaise">): AmountCheck {
  const parsed = parseRupeesInput(text);
  if (parsed === null) return fail("validation", INVEST_MESSAGES.amountFormat, { field: "amount" });
  if (parsed === TOO_LARGE || parsed > plan.maxPaise) {
    return fail("validation", `The maximum for this plan is ${formatPaise(plan.maxPaise)}.`, { field: "amount" });
  }
  if (parsed < plan.minPaise) {
    return fail("validation", `The minimum for this plan is ${formatPaise(plan.minPaise)}.`, { field: "amount" });
  }
  return { ok: true, amountPaise: parsed };
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createIntent(
  input: { planSlug: unknown; amount: unknown },
  deps: { loadPlan: (slug: string) => Promise<PlanLookup>; post: PostJson; ping: Ping },
): Promise<CreateIntentResult> {
  const planSlug = typeof input.planSlug === "string" ? input.planSlug.trim() : "";
  const amount = typeof input.amount === "string" ? input.amount : "";
  if (!SLUG.test(planSlug) || planSlug.length > 60) return fail("not_found", INVEST_MESSAGES.planNotFound);
  if (amount.length > 32) return fail("validation", INVEST_MESSAGES.amountFormat, { field: "amount" });
  if (parseRupeesInput(amount) === null) return fail("validation", INVEST_MESSAGES.amountFormat, { field: "amount" });

  const lookup = await deps.loadPlan(planSlug);
  if (lookup.status === "unavailable") return fail("unavailable", GENERIC_MESSAGES.unavailable);
  if (lookup.status === "not_found") return fail("not_found", INVEST_MESSAGES.planNotFound);
  const plan = lookup.plan;
  const checked = checkAmount(amount, plan);
  if (!checked.ok) return checked;

  const body = investmentCreateSchema.safeParse({ planSlug, amountPaise: checked.amountPaise });
  if (!body.success) return fail("validation", INVEST_MESSAGES.amountFormat, { field: "amount" });

  const result = await deps.post<InvestmentCreateResponse>("/v1/investments", body.data);
  if (result.ok) {
    const investment = toInvestment(result.data?.investment);
    const agreement = toDocument(result.data?.agreement);
    if (!investment || !agreement) {
      logBackendError("invest create", { code: "internal" });
      return fail("unavailable", GENERIC_MESSAGES.fallback);
    }
    return { ok: true, investmentId: investment.id };
  }
  const { error } = result;
  if (error.code === "validation") {
    return fail("validation", error.fields?.amountPaise?.[0] ?? "Check the amount and try again.", { field: "amount" });
  }
  if (error.code === "not_found") return fail("not_found", INVEST_MESSAGES.planNotFound);
  if (error.code === "conflict") return fail("conflict", INVEST_MESSAGES.tooManyPending);
  return common(error, "invest create", deps.ping);
}

function challenge(value: unknown): ConsentChallengeResponse | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!isUuid(raw.challengeId) || typeof raw.expiresAt !== "string") return null;
  if (Number.isNaN(new Date(raw.expiresAt).getTime())) return null;
  return { challengeId: raw.challengeId, expiresAt: raw.expiresAt };
}

export async function requestConsent(
  investmentId: unknown,
  deps: { post: PostJson; ping: Ping; now?: () => number },
): Promise<ConsentRequestResult> {
  if (!isUuid(investmentId)) return fail("not_found", INVEST_MESSAGES.notFound);
  const result = await deps.post<ConsentChallengeResponse>(`/v1/investments/${investmentId}/consent/request`);
  if (result.ok) {
    const parsed = challenge(result.data);
    if (!parsed) {
      logBackendError("invest consent request", { code: "internal" });
      return fail("unavailable", GENERIC_MESSAGES.fallback);
    }
    const now = (deps.now ?? Date.now)();
    const expiresInSeconds = Math.max(0, Math.round((new Date(parsed.expiresAt).getTime() - now) / 1000));
    return { ok: true, challengeId: parsed.challengeId, expiresInSeconds, resendAfterSeconds: CONSENT_RESEND_SECONDS };
  }
  const { error } = result;
  if (error.code === "conflict") return fail("conflict", INVEST_MESSAGES.notAwaitingConsent);
  if (error.code === "sms_failed") return fail("sms_failed", INVEST_MESSAGES.smsFailed);
  if (error.code === "rate_limited") {
    return fail("rate_limited", `Too many codes requested. ${waitText(error.retryAfterSeconds)}`, {
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }
  return common(error, "invest consent request", deps.ping);
}

export async function verifyConsent(
  input: { investmentId: unknown; challengeId: unknown; code: unknown },
  deps: { post: PostJson; ping: Ping },
): Promise<ConsentVerifyResult> {
  if (!isUuid(input.investmentId)) return fail("not_found", INVEST_MESSAGES.notFound);
  const code = typeof input.code === "string" ? input.code.replace(/\s/g, "") : "";
  const parsed = consentVerifySchema.safeParse({ challengeId: input.challengeId, code });
  if (!parsed.success) {
    const codeIssue = parsed.error.issues.some((issue) => issue.path[0] === "code");
    return codeIssue
      ? fail("validation", INVEST_MESSAGES.codeFormat, { field: "code" })
      : fail("otp_expired", INVEST_MESSAGES.sessionLost);
  }
  const result = await deps.post<unknown>(`/v1/investments/${input.investmentId}/consent/verify`, parsed.data);
  if (result.ok) return { ok: true };
  const { error } = result;
  switch (error.code) {
    case "otp_invalid":
      return fail("otp_invalid", INVEST_MESSAGES.codeInvalid, { field: "code" });
    case "validation":
      return fail("validation", INVEST_MESSAGES.codeFormat, { field: "code" });
    case "otp_expired":
      return fail("otp_expired", INVEST_MESSAGES.codeExpired);
    case "otp_exhausted":
      return fail("otp_exhausted", INVEST_MESSAGES.codeExhausted);
    case "conflict":
      return fail("conflict", INVEST_MESSAGES.notAwaitingConsent);
    default:
      return common(error, "invest consent verify", deps.ping);
  }
}

export function parseCashfreeMode(value: string | undefined): CashfreeMode | null {
  const mode = (value ?? "sandbox").trim().toLowerCase();
  return mode === "sandbox" || mode === "production" ? mode : null;
}

function session(value: unknown): PaymentSession | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const payment = toPaymentSummary(raw.payment);
  if (
    !payment ||
    typeof raw.paymentSessionId !== "string" ||
    raw.paymentSessionId.length < 8 ||
    raw.paymentSessionId.length > 512 ||
    (raw.environment !== "sandbox" && raw.environment !== "production")
  ) {
    return null;
  }
  return { payment, paymentSessionId: raw.paymentSessionId, environment: raw.environment };
}

export async function startPayment(
  investmentId: unknown,
  deps: { post: PostJson; ping: Ping; mode: CashfreeMode | null },
): Promise<StartPaymentResult> {
  if (!isUuid(investmentId)) return fail("not_found", INVEST_MESSAGES.notFound);
  if (!deps.mode) {
    console.error("[invest payment] NEXTERA_CASHFREE_MODE must be sandbox or production");
    return fail("unavailable", GENERIC_MESSAGES.misconfigured);
  }
  const result = await deps.post<PaymentSession>(`/v1/investments/${investmentId}/payment`);
  if (result.ok) {
    const parsed = session(result.data);
    if (!parsed) {
      logBackendError("invest payment", { code: "internal" });
      return fail("unavailable", GENERIC_MESSAGES.fallback);
    }
    if (parsed.environment !== deps.mode) {
      console.error(
        `[invest payment] the backend issued a ${parsed.environment} payment session but NEXTERA_CASHFREE_MODE is ${deps.mode}; check CASHFREE_ENV and NEXTERA_CASHFREE_MODE`,
      );
      return fail("unavailable", GENERIC_MESSAGES.misconfigured);
    }
    return { ok: true, paymentSessionId: parsed.paymentSessionId, mode: parsed.environment };
  }
  const { error } = result;
  if (error.code === "consent_required") return fail("consent_required", INVEST_MESSAGES.consentRequired);
  if (error.code === "payment_preparing") return fail("conflict", INVEST_MESSAGES.preparing);
  if (error.code === "conflict") return fail("conflict", INVEST_MESSAGES.notAwaitingPayment);
  if (error.code === "provider_unavailable") return fail("gateway", INVEST_MESSAGES.gateway);
  return common(error, "invest payment", deps.ping);
}
