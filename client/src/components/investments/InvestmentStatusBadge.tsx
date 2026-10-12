import type { InvestmentStatus } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import { investmentStatusCopy } from "@/lib/investments";

export function InvestmentStatusBadge({ status }: { status: InvestmentStatus }) {
  const copy = investmentStatusCopy[status];
  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}
