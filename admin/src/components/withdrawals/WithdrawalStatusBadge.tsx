import type { WithdrawalStatus } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";

const labels: Record<WithdrawalStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  processing: "Processing",
  paid: "Paid",
  rejected: "Rejected",
  cancelled: "Cancelled",
  failed: "Failed",
  reversed: "Reversed",
};

const tones: Record<WithdrawalStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  requested: "warning",
  approved: "info",
  processing: "info",
  paid: "success",
  rejected: "neutral",
  cancelled: "neutral",
  failed: "danger",
  reversed: "danger",
};

export function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}
