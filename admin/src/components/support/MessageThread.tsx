import type { AdminTicketMessage } from "@nextera/contracts";
import { PlainText } from "@/components/desk/PlainText";
import { Badge } from "@/components/ui/Badge";
import { cx } from "@/lib/cx";
import { formatDateTime } from "@/lib/format";
import { attachmentUrl } from "@/lib/queries/support";
import { formatBytes } from "@/lib/format";

function kind(message: AdminTicketMessage): "customer" | "staff" | "internal" {
  if (message.authorType === "customer") return "customer";
  return message.internal ? "internal" : "staff";
}

const styles = {
  customer: "hairline bg-horizon/60 sm:mr-12",
  staff: "border border-gold/30 bg-gold/5 sm:ml-12",
  internal: "border border-dashed border-lagoon/50 bg-lagoon/5 sm:ml-12",
} as const;

const labels = { customer: "Customer", staff: "Reply", internal: "Internal note" } as const;

export function MessageThread({ ticketId, messages }: { ticketId: string; messages: AdminTicketMessage[] }) {
  if (messages.length === 0) return <p className="text-sm text-dust">No messages yet.</p>;

  return (
    <ol className="grid gap-3" aria-label="Conversation">
      {messages.map((message) => {
        const type = kind(message);
        const author = message.authorName ?? (type === "customer" ? "Customer" : "Staff");
        return (
          <li key={message.id}>
            <article aria-label={`${labels[type]} from ${author}`} className={cx("grid gap-2 rounded-[3px] p-4", styles[type])}>
              <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="font-medium text-parchment">{author}</span>
                <Badge tone={type === "internal" ? "info" : type === "staff" ? "warning" : "neutral"}>{labels[type]}</Badge>
                {type === "internal" ? <span className="text-lagoon">Not visible to the customer</span> : null}
                <time dateTime={message.createdAt} className="ml-auto text-dust">
                  {formatDateTime(message.createdAt)}
                </time>
              </header>
              <PlainText text={message.body} className="text-sm" />
              {message.attachment ? (
                <a
                  href={attachmentUrl(ticketId, message.id)}
                  download={message.attachment.name}
                  className="hairline inline-flex w-fit max-w-full items-center gap-2 rounded-[3px] px-2.5 py-1.5 text-xs hover:bg-ink"
                >
                  <span className="truncate font-mono">{message.attachment.name}</span>
                  <span className="shrink-0 text-dust">{formatBytes(message.attachment.sizeBytes)}</span>
                  <span className="sr-only">, download</span>
                </a>
              ) : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
