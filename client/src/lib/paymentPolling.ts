import type { PaymentStatusResponse } from "@nextera/contracts";

export type PaymentView =
  | "success"
  | "awaiting_bond"
  | "processing"
  | "activating"
  | "not_started"
  | "needs_consent"
  | "retry"
  | "review"
  | "cancelled";

export const FAST_POLL_MS = 5_000;
export const SLOW_POLL_MS = 10_000;
export const BOND_POLL_MS = 5_000;
export const FAST_WINDOW_MS = 2 * 60_000;
export const PAYMENT_WINDOW_MS = 15 * 60_000;
export const BOND_WINDOW_MS = 5 * 60_000;

export function paymentView(data: PaymentStatusResponse): PaymentView {
  const { investment, payment } = data;
  if (investment.status === "active" || investment.status === "matured") {
    return investment.bondNo ? "success" : "awaiting_bond";
  }
  if (investment.status === "cancelled") return "cancelled";
  if (!investment.consentedAt) return "needs_consent";
  if (!payment) return "not_started";
  if (payment.status === "expired") return "retry";
  if (payment.status === "flagged") return "review";
  if (payment.status === "paid" || payment.gatewayStatus === "PAID") return "activating";
  return "processing";
}

export function isTerminal(view: PaymentView): boolean {
  return view !== "processing" && view !== "activating" && view !== "awaiting_bond";
}

export function pollInterval(view: PaymentView | null, elapsedMs: number): number | false {
  if (view === null || view === "processing" || view === "activating") {
    if (elapsedMs < FAST_WINDOW_MS) return FAST_POLL_MS;
    if (elapsedMs < PAYMENT_WINDOW_MS) return SLOW_POLL_MS;
    return false;
  }
  if (view === "awaiting_bond") return elapsedMs < BOND_WINDOW_MS ? BOND_POLL_MS : false;
  return false;
}

export function pollTimedOut(view: PaymentView | null, elapsedMs: number): boolean {
  return !isTerminalOrNull(view) && pollInterval(view, elapsedMs) === false;
}

function isTerminalOrNull(view: PaymentView | null): boolean {
  return view !== null && isTerminal(view);
}

export function canPay(view: PaymentView): boolean {
  return view === "not_started" || view === "retry" || view === "processing";
}
