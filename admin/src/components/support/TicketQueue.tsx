"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/desk/EmptyState";
import { LoadMore } from "@/components/desk/LoadMore";
import { TicketPriorityBadge, TicketStatusBadge, TicketWaitBadge } from "@/components/support/TicketBadges";
import { Notice } from "@/components/ui/Notice";
import { supportQueries } from "@/lib/queries/support";
import type { TicketListParams } from "@/lib/support/filters";
import { ageLabel, ticketCategoryLabels } from "@/lib/support/labels";
import { useNow } from "@/lib/useNow";

export function TicketQueue({
  params,
  filtered,
  renderedAt,
}: {
  params: TicketListParams;
  filtered: boolean;
  renderedAt: number;
}) {
  const now = useNow(renderedAt);
  const { data, error, isPending, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, isPlaceholderData } =
    useInfiniteQuery(supportQueries.list(params));

  if (isPending) return <p className="text-sm text-dust">Loading tickets…</p>;
  if (error && !data) return <Notice tone="error">{error.message}</Notice>;

  const tickets = data?.pages.flatMap((page) => page.items) ?? [];

  if (tickets.length === 0) {
    return (
      <EmptyState>
        {filtered || params.status !== "open" ? "No tickets match these filters." : "No open tickets. The queue is clear."}
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <caption className="sr-only">Support tickets, most recent activity first</caption>
          <thead>
            <tr>
              <th scope="col">Ticket</th>
              <th scope="col">Customer</th>
              <th scope="col">Category</th>
              <th scope="col">Priority</th>
              <th scope="col">Status</th>
              <th scope="col">Assignee</th>
              <th scope="col">Waiting</th>
              <th scope="col">Opened</th>
            </tr>
          </thead>
          <tbody className={isPlaceholderData ? "opacity-60" : undefined}>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td className="max-w-72">
                  <Link href={`/support/${ticket.id}`} className="font-medium hover:text-gold">
                    {ticket.subject}
                  </Link>
                  <div className="font-mono text-xs text-dust">{ticket.ref}</div>
                </td>
                <td>
                  {ticket.customer.name ?? <span className="text-dust">Unnamed</span>}
                  <div className="font-mono text-xs text-dust">{ticket.customer.phone}</div>
                </td>
                <td className="text-dust">{ticketCategoryLabels[ticket.category]}</td>
                <td>
                  <TicketPriorityBadge priority={ticket.priority} />
                </td>
                <td>
                  <TicketStatusBadge status={ticket.status} />
                </td>
                <td>{ticket.assignee?.name ?? <span className="text-dust">Unassigned</span>}</td>
                <td className="whitespace-nowrap">
                  <TicketWaitBadge ticket={ticket} now={now} />
                </td>
                <td className="whitespace-nowrap text-dust">
                  <time dateTime={ticket.createdAt}>{ageLabel(ticket.createdAt, now)} ago</time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LoadMore
        count={tickets.length}
        hasMore={Boolean(hasNextPage)}
        loading={isFetchingNextPage}
        onMore={() => void fetchNextPage()}
        noun={{ one: "ticket", many: "tickets" }}
      />
      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}
    </div>
  );
}
