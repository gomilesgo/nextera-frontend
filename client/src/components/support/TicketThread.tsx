import type { TicketMessage } from "@nextera/contracts";
import { cx } from "@/lib/cx";
import { formatBytes, formatTicketTime } from "@/lib/support/copy";
import { attachmentDownloadHref } from "@/lib/support/requests";

function AttachmentLink({ ticketId, message }: { ticketId: string; message: TicketMessage }) {
  if (!message.attachment) return null;
  const { name, sizeBytes } = message.attachment;
  return (
    <a
      href={attachmentDownloadHref(ticketId, message.id)}
      download
      className="mt-4 inline-flex max-w-full items-center gap-3 rounded-[2px] border border-parchment/15 bg-inkwell/40 px-3 py-2 text-sm text-parchment/85 transition-colors hover:border-lagoon hover:text-lagoon"
    >
      <span aria-hidden="true" className="font-mono text-[10px] uppercase tracking-[0.14em] text-dust">
        File
      </span>
      <span className="min-w-0 truncate">{name}</span>
      <span className="shrink-0 text-xs text-dust tnum">{formatBytes(sizeBytes)}</span>
      <span className="sr-only">, download</span>
    </a>
  );
}

export function TicketThread({ ticketId, messages }: { ticketId: string; messages: TicketMessage[] }) {
  if (messages.length === 0) {
    return <p className="text-dust">No messages yet.</p>;
  }
  return (
    <ol className="grid gap-4" aria-label="Conversation">
      {messages.map((message) => {
        const mine = message.authorType === "customer";
        return (
          <li key={message.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
            <article
              aria-label={mine ? "Your message" : "Message from the Srahira team"}
              className={cx(
                "w-full max-w-[44rem] rounded-[2px] border p-4 sm:w-[85%] sm:p-5",
                mine ? "border-gold/25 bg-gold/[0.06]" : "border-lagoon/25 bg-horizon",
              )}
            >
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className={cx("font-mono text-[11px] uppercase tracking-[0.16em]", mine ? "text-gold" : "text-lagoon")}>
                  {mine ? "You" : "Srahira team"}
                </p>
                <p className="text-xs text-dust">
                  <time dateTime={message.createdAt}>{formatTicketTime(message.createdAt)}</time>
                </p>
              </header>
              <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-parchment/90">{message.body}</p>
              <AttachmentLink ticketId={ticketId} message={message} />
            </article>
          </li>
        );
      })}
    </ol>
  );
}
