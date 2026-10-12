"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DetailItem } from "@/components/desk/DetailItem";
import { MessageThread } from "@/components/support/MessageThread";
import { ReplyComposer } from "@/components/support/ReplyComposer";
import { TicketPriorityBadge, TicketStatusBadge, TicketWaitBadge } from "@/components/support/TicketBadges";
import { TicketControls } from "@/components/support/TicketControls";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime, humanize } from "@/lib/format";
import { supportQueries } from "@/lib/queries/support";
import { ticketCategoryLabels } from "@/lib/support/labels";
import { useNow } from "@/lib/useNow";

export function TicketDetail({ ticketId, canWrite, renderedAt }: { ticketId: string; canWrite: boolean; renderedAt: number }) {
  const now = useNow(renderedAt);
  const { data, error, isPending } = useQuery(supportQueries.detail(ticketId));

  if (isPending) return <p className="text-sm text-dust">Loading ticket…</p>;
  if (!data) return <Notice tone="error">{error?.message ?? "Ticket not found"}</Notice>;

  const { ticket, customer, messages } = data;
  const closed = ticket.status === "closed";

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow={`Ticket ${ticket.ref} · ${ticketCategoryLabels[ticket.category]}`}
        title={ticket.subject}
        description={`Opened ${formatDateTime(ticket.createdAt)}`}
        actions={
          <>
            <TicketPriorityBadge priority={ticket.priority} />
            <TicketStatusBadge status={ticket.status} />
            <ButtonLink href="/support" variant="ghost" size="sm">
              Back to queue
            </ButtonLink>
          </>
        }
      />

      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 content-start gap-4">
          <section aria-labelledby="thread-heading" className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="thread-heading" className="eyebrow">
                Conversation
              </h2>
              <span className="flex items-center gap-2 text-xs text-dust">
                Waiting <TicketWaitBadge ticket={ticket} now={now} />
              </span>
            </div>
            <MessageThread ticketId={ticket.id} messages={messages} />
          </section>
          {canWrite ? (
            closed ? (
              <Notice>This ticket is closed. Reopen it from the ticket panel to reply or add a note.</Notice>
            ) : (
              <ReplyComposer ticketId={ticket.id} status={ticket.status} />
            )
          ) : null}
        </div>

        <aside aria-label="Ticket details" className="grid content-start gap-4">
          <section aria-labelledby="customer-heading" className="hairline grid gap-3 rounded-[3px] bg-horizon/40 p-4">
            <h2 id="customer-heading" className="text-sm font-medium">
              Customer
            </h2>
            <dl className="grid gap-3">
              <DetailItem label="Name">
                <Link href={`/customers/${customer.id}`} className="hover:text-gold">
                  {customer.name ?? "Unnamed customer"}
                </Link>
              </DetailItem>
              <DetailItem label="Mobile">
                <span className="font-mono">{customer.phone}</span>
              </DetailItem>
              <DetailItem label="Email">{customer.email ?? "—"}</DetailItem>
              <DetailItem label="Account">{humanize(customer.status)}</DetailItem>
              <DetailItem label="KYC">{humanize(customer.kycStatus)}</DetailItem>
            </dl>
          </section>
          {canWrite ? <TicketControls ticket={ticket} /> : <Notice>You have read-only access to support.</Notice>}
          {ticket.closedAt ? <p className="text-xs text-dust">Closed {formatDateTime(ticket.closedAt)}</p> : null}
        </aside>
      </div>
    </div>
  );
}
