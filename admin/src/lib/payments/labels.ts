import type {
  PaymentActivationSource,
  PaymentEventSource,
  PaymentFlagReason,
  PaymentFlagResolution,
  PaymentStatus,
} from "@nextera/contracts";

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  created: "Awaiting payment",
  paid: "Paid",
  expired: "Expired",
  flagged: "Flagged",
};

export const paymentStatusTones = {
  created: "warning",
  paid: "success",
  expired: "neutral",
  flagged: "danger",
} as const satisfies Record<PaymentStatus, string>;

export const flagReasonLabels: Record<PaymentFlagReason, string> = {
  amount_mismatch: "Amount mismatch",
  currency_mismatch: "Currency mismatch",
  unknown_order: "Unknown order",
  investment_not_pending: "Investment no longer pending",
  customer_not_eligible: "Customer not eligible",
  paid_after_expiry: "Paid after expiry",
};

export const flagReasonHelp: Record<PaymentFlagReason, string> = {
  amount_mismatch: "Cashfree reported a different amount from the one on the order. Nothing was activated.",
  currency_mismatch: "Cashfree reported a currency other than INR. Nothing was activated.",
  unknown_order: "A webhook arrived for an order this platform did not create.",
  investment_not_pending: "The order was paid, but its investment had already been activated or closed.",
  customer_not_eligible: "The order was paid while the customer was not active with verified KYC.",
  paid_after_expiry: "The order was paid after it expired and its investment was cancelled.",
};

export const eventSourceLabels: Record<PaymentEventSource, string> = {
  webhook: "Webhook",
  reconcile: "Reconcile",
};

export const activationSourceLabels: Record<PaymentActivationSource, string> = {
  webhook: "Webhook",
  reconcile: "Reconcile job",
};

export const resolutionLabels: Record<PaymentFlagResolution, string> = {
  refunded: "Refunded in Cashfree",
  posted_manually: "Posted manually to the ledger",
  activated: "Investment activated",
};

export const resolutionReferenceLabels: Record<PaymentFlagResolution, string | null> = {
  refunded: "Cashfree refund id",
  posted_manually: "Ledger transaction id",
  activated: null,
};
