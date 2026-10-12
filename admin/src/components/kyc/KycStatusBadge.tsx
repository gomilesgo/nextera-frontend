import type { KycStatus } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";

const tones = { none: "neutral", submitted: "warning", verified: "success", rejected: "danger" } as const;

export function KycStatusBadge({ status }: { status: KycStatus }) {
  return <Badge tone={tones[status]}>{status}</Badge>;
}
