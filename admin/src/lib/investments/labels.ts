import type { DocumentKind, InvestmentStatus } from "@nextera/contracts";

export const investmentStatusLabels: Record<InvestmentStatus, string> = {
  pending_payment: "Pending payment",
  active: "Active",
  matured: "Matured",
  cancelled: "Cancelled",
};

export const investmentStatusTones = {
  pending_payment: "warning",
  active: "success",
  matured: "info",
  cancelled: "neutral",
} as const satisfies Record<InvestmentStatus, string>;

export const documentKindLabels: Record<DocumentKind, string> = {
  agreement: "Investment agreement",
  bond: "Bond certificate",
  statement: "Statement",
};

export function tenureLabel(months: number): string {
  return `${months} ${months === 1 ? "month" : "months"}`;
}
