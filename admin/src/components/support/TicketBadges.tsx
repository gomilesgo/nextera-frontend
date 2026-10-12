import type { AdminTicketSummary, TicketPriority, TicketStatus } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import {
  responseTargetHours,
  ticketPriorityLabels,
  ticketPriorityTones,
  ticketStatusLabels,
  ticketStatusTones,
  ticketWait,
} from "@/lib/support/labels";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={ticketStatusTones[status]}>{ticketStatusLabels[status]}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge tone={ticketPriorityTones[priority]}>{ticketPriorityLabels[priority]}</Badge>;
}

export function TicketWaitBadge({
  ticket,
  now,
}: {
  ticket: Pick<AdminTicketSummary, "status" | "priority" | "lastMessageAt">;
  now: number;
}) {
  const wait = ticketWait(ticket, now);
  const title =
    ticket.status === "open"
      ? `Last activity ${formatDateTime(ticket.lastMessageAt)}. Target for ${ticketPriorityLabels[ticket.priority].toLowerCase()} priority: ${responseTargetHours[ticket.priority]}h.`
      : `Last activity ${formatDateTime(ticket.lastMessageAt)}.`;
  return (
    <time dateTime={ticket.lastMessageAt} title={title}>
      <Badge tone={wait.tone}>{wait.label}</Badge>
    </time>
  );
}
