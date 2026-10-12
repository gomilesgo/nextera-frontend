import Link from "next/link";
import type { PaymentEvent } from "@nextera/contracts";
import { Section } from "@/components/investments/DetailList";
import { EmptyState } from "@/components/desk/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import { eventSourceLabels, flagReasonLabels, resolutionLabels } from "@/lib/payments/labels";

export function eventJson(event: PaymentEvent): string {
  return JSON.stringify(event, null, 2);
}

export function PaymentEvents({ events }: { events: readonly PaymentEvent[] }) {
  return (
    <Section
      id="events-heading"
      title="Webhook and reconcile events"
      aside={events.length ? "Payloads are redacted by the server" : null}
    >
      {events.length === 0 ? (
        <EmptyState>No gateway events have been recorded for this investment.</EmptyState>
      ) : (
        <ol className="hairline divide-y divide-border rounded-[3px]">
          {events.map((event) => (
            <li key={event.id} className="grid gap-2 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-xs">{event.type}</span>
                <Badge tone="info">{eventSourceLabels[event.source]}</Badge>
                {event.flagReason ? (
                  <Link href={`/payment-flags/${event.id}`} className="hover:opacity-80">
                    <Badge tone={event.resolvedAt ? "neutral" : "danger"}>
                      {flagReasonLabels[event.flagReason]}
                      {event.resolvedAt ? " · resolved" : " · open"}
                    </Badge>
                  </Link>
                ) : null}
                <span className="ml-auto text-xs whitespace-nowrap text-dust">
                  <time dateTime={event.receivedAt}>{formatDateTime(event.receivedAt)}</time>
                </span>
              </div>
              {event.flagDetail ? <p className="text-xs break-words text-dust">{event.flagDetail}</p> : null}
              {event.resolutionType ? (
                <p className="text-xs text-dust">
                  {resolutionLabels[event.resolutionType]}
                  {event.resolutionReference ? <span className="font-mono"> · {event.resolutionReference}</span> : null}
                </p>
              ) : null}
              <details className="text-xs">
                <summary className="cursor-pointer text-dust hover:text-parchment">Event record</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-[3px] bg-inkwell p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                  {eventJson(event)}
                </pre>
              </details>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
