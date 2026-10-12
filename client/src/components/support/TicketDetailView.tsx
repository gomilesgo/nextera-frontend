"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ApiError } from "@/lib/api/errors";
import { ticketQuery } from "@/lib/queries/support";
import { categoryCopy, formatTicketDate, statusCopy } from "@/lib/support/copy";
import { CloseTicketControl } from "./CloseTicketControl";
import { ReplyComposer } from "./ReplyComposer";
import { SupportNotFoundPanel } from "./SupportNotFoundPanel";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketThread } from "./TicketThread";

export function TicketDetailView({ id }: { id: string }) {
  const detail = useQuery(ticketQuery(id));

  if (detail.isPending) {
    return (
      <p className="text-dust" role="status">
        Loading your request…
      </p>
    );
  }

  if (detail.isError && !detail.data) {
    if (detail.error instanceof ApiError && detail.error.status === 404) return <SupportNotFoundPanel />;
    return (
      <Notice tone="error" title="We could not load this request">
        <span className="block">{detail.error.message}</span>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => detail.refetch()} disabled={detail.isFetching}>
          {detail.isFetching ? "Retrying…" : "Try again"}
        </Button>
      </Notice>
    );
  }

  const { ticket, messages } = detail.data;
  const closed = ticket.status === "closed";

  return (
    <div className="grid gap-8">
      <nav aria-label="Breadcrumb">
        <Link href="/portal/support" className="text-sm text-dust hover:text-lagoon">
          <span aria-hidden="true">← </span>All requests
        </Link>
      </nav>

      <header className="grid gap-4 border-b border-border pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dust">
          <span className="tnum">{ticket.ref}</span>
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          {categoryCopy[ticket.category].label}
        </p>
        <h1 className="break-words font-display text-[clamp(1.75rem,4.5vw,2.75rem)] leading-tight">{ticket.subject}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-dust">
          <TicketStatusBadge status={ticket.status} />
          <span>
            Opened <time dateTime={ticket.createdAt}>{formatTicketDate(ticket.createdAt)}</time>
          </span>
          {ticket.closedAt ? (
            <span>
              Closed <time dateTime={ticket.closedAt}>{formatTicketDate(ticket.closedAt)}</time>
            </span>
          ) : null}
        </div>
        <p className="max-w-2xl text-parchment/75">{statusCopy[ticket.status].body}</p>
      </header>

      <section aria-labelledby="thread-heading" className="grid gap-4">
        <h2 id="thread-heading" className="sr-only">
          Conversation
        </h2>
        <TicketThread ticketId={ticket.id} messages={messages} />
      </section>

      <section className="grid gap-6 border-t border-border pt-8">
        {closed ? (
          <Notice tone="info" title="This request is closed">
            <span className="block">Closed requests cannot take new replies. Start a new request if you still need help.</span>
            <ButtonLink href="/portal/support/new" variant="ghost" size="sm" className="mt-3">
              New request
            </ButtonLink>
          </Notice>
        ) : (
          <>
            <ReplyComposer key={ticket.id} ticketId={ticket.id} status={ticket.status} />
            <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-dust">Got what you needed? You can close this request.</p>
              <CloseTicketControl ticketId={ticket.id} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
