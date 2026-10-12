export const errorCodes = [
  "validation",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "insufficient_funds",
  "otp_invalid",
  "otp_expired",
  "otp_exhausted",
  "account_blocked",
  "account_locked",
  "sms_failed",
  "bank_account_invalid",
  "provider_unavailable",
  "kyc_not_verified",
  "password_change_required",
  "bank_account_required",
  "consent_required",
  "invalid_signature",
  "internal",
  "customer_closed",
  "export_too_large",
  "customer_inactive",
  "payout_on_hold",
  "bank_account_changed",
  "payment_preparing",
  "payout_settled",
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string[]>;
    retryAfterSeconds?: number;
  };
};
