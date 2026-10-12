import type { PlanStatus } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";

const tones = { draft: "warning", active: "success", archived: "neutral" } as const;

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <Badge tone={tones[status]}>{status}</Badge>;
}
