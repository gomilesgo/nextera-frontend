import { acceptedNameMatches } from "@nextera/contracts";

export type BankQueueStatus = "review" | "verified" | "rejected";

export const bankQueueStatuses: readonly BankQueueStatus[] = ["review", "verified", "rejected"];

export const bankQueueTabs: readonly { value: BankQueueStatus; label: string }[] = [
  { value: "review", label: "Held for review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

const matchLabels: Record<string, string> = {
  DIRECT_MATCH: "Direct match",
  GOOD_PARTIAL_MATCH: "Good partial match",
  MODERATE_PARTIAL_MATCH: "Moderate partial match",
  POOR_PARTIAL_MATCH: "Poor partial match",
  NO_MATCH: "No match",
};

const holdLabels: Record<string, string> = {
  kyc_rejected: "KYC was rejected",
  kyc_resubmitted: "Customer resubmitted KYC",
};

export function matchLabel(result: string | null): string {
  if (!result) return "Not reported";
  return matchLabels[result] ?? result;
}

export function isAcceptedMatch(result: string | null): boolean {
  return result !== null && acceptedNameMatches.includes(result);
}

export function holdLabel(reason: string | null): string {
  if (!reason) return "Weak name match";
  return holdLabels[reason] ?? reason;
}

export function formatScore(score: string | null): string {
  if (score === null || score.trim() === "") return "—";
  const value = Number(score);
  return Number.isFinite(value) ? `${Number(value.toFixed(2))} / 100` : score;
}
