import type { BankAccountStatus } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";

const tones = {
  pending: "neutral",
  verified: "success",
  failed: "danger",
  review: "warning",
  rejected: "danger",
} as const;

export function BankStatusBadge({ status }: { status: BankAccountStatus }) {
  return <Badge tone={tones[status]}>{status}</Badge>;
}
