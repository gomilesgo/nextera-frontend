import { describe, expect, it } from "vitest";
import type { PaymentStatus, PaymentStatusResponse, InvestmentStatus } from "@nextera/contracts";
import {
  BOND_POLL_MS,
  BOND_WINDOW_MS,
  FAST_POLL_MS,
  PAYMENT_WINDOW_MS,
  canPay,
  isTerminal,
  paymentView,
  pollInterval,
  pollTimedOut,
} from "./paymentPolling";

type Overrides = {
  status?: InvestmentStatus;
  consentedAt?: string | null;
  bondNo?: string | null;
  payment?: PaymentStatus | null;
};

function status(overrides: Overrides = {}): PaymentStatusResponse {
  const payment = overrides.payment === undefined ? "created" : overrides.payment;
  return {
    investment: {
      id: "6f1c2a0e-3b4d-4c5e-8f90-123456789abc",
      planId: "p1",
      planSlug: "steady-12",
      planName: "Steady 12",
      principalPaise: 135_000_000,
      rateBps: 800,
      tenureMonths: 12,
      monthlyReturnPaise: 900_000,
      status: overrides.status ?? "pending_payment",
      startDate: null,
      maturityDate: null,
      bondNo: overrides.bondNo ?? null,
      consentedAt: overrides.consentedAt === undefined ? "2026-10-01T05:00:00Z" : overrides.consentedAt,
      activatedAt: null,
      maturedAt: null,
      cancelledAt: null,
      createdAt: "2026-10-01T04:55:00Z",
    },
    payment:
      payment === null
        ? null
        : {
            id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
            orderId: "nxp_1",
            amountPaise: 135_000_000,
            status: payment,
            gatewayStatus: "ACTIVE",
            expiresAt: "2026-10-01T05:30:00Z",
            paidAt: null,
            createdAt: "2026-10-01T05:00:00Z",
          },
  };
}

describe("paymentView", () => {
  it("treats only an active investment as paid, never the return URL", () => {
    expect(paymentView(status({ status: "active", bondNo: "NXB-2026-000001", payment: "paid" }))).toBe("success");
    expect(paymentView(status({ status: "active", payment: "paid" }))).toBe("awaiting_bond");
    expect(paymentView(status({ payment: "paid" }))).toBe("activating");
  });

  it("separates pending, expired, flagged, cancelled and unstarted payments", () => {
    expect(paymentView(status())).toBe("processing");
    expect(paymentView(status({ payment: "expired" }))).toBe("retry");
    expect(paymentView(status({ payment: "flagged" }))).toBe("review");
    expect(paymentView(status({ status: "cancelled", payment: "expired" }))).toBe("cancelled");
    expect(paymentView(status({ payment: null }))).toBe("not_started");
    expect(paymentView(status({ consentedAt: null, payment: null }))).toBe("needs_consent");
    expect(paymentView(status({ status: "matured", bondNo: "NXB-2026-000002", payment: "paid" }))).toBe("success");
  });
});

describe("polling stop conditions", () => {
  it("stops at every terminal state", () => {
    for (const view of ["success", "retry", "review", "cancelled", "not_started", "needs_consent"] as const) {
      expect(isTerminal(view)).toBe(true);
      expect(pollInterval(view, 0)).toBe(false);
    }
  });

  it("reads the gateway status to tell an open order from a paid one", () => {
    const paidAtGateway = status();
    if (paidAtGateway.payment) paidAtGateway.payment.gatewayStatus = "PAID";
    expect(paymentView(paidAtGateway)).toBe("activating");
    expect(paymentView(status())).toBe("processing");
    expect(isTerminal("activating")).toBe(false);
    expect(pollInterval("activating", 0)).toBe(FAST_POLL_MS);
  });

  it("never polls faster than every 5 seconds", () => {
    expect(FAST_POLL_MS).toBeGreaterThanOrEqual(5_000);
  });

  it("polls while processing and gives up after the payment window", () => {
    expect(pollInterval("processing", 0)).toBe(FAST_POLL_MS);
    expect(pollInterval("processing", PAYMENT_WINDOW_MS)).toBe(false);
    expect(pollTimedOut("processing", PAYMENT_WINDOW_MS)).toBe(true);
    expect(pollTimedOut("processing", 1_000)).toBe(false);
  });

  it("keeps polling briefly for the bond number after activation", () => {
    expect(pollInterval("awaiting_bond", 1_000)).toBe(BOND_POLL_MS);
    expect(pollInterval("awaiting_bond", BOND_WINDOW_MS)).toBe(false);
    expect(pollTimedOut("success", BOND_WINDOW_MS)).toBe(false);
  });

  it("offers payment only while the investment can still be paid", () => {
    expect(canPay("retry")).toBe(true);
    expect(canPay("not_started")).toBe(true);
    expect(canPay("success")).toBe(false);
    expect(canPay("cancelled")).toBe(false);
    expect(canPay("review")).toBe(false);
  });
});
