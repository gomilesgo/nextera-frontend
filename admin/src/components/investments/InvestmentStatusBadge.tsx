import type { InvestmentStatus } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import { investmentStatusLabels, investmentStatusTones } from "@/lib/investments/labels";

export function InvestmentStatusBadge({ status }: { status: InvestmentStatus }) {
  return <Badge tone={investmentStatusTones[status]}>{investmentStatusLabels[status]}</Badge>;
}
