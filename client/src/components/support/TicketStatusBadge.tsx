import type { TicketStatus } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import { statusCopy } from "@/lib/support/copy";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const copy = statusCopy[status];
  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}
