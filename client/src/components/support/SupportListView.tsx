"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { TicketStatus, TicketSummary } from "@nextera/contracts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { cx } from "@/lib/cx";
import { ticketsQuery } from "@/lib/queries/support";
import { categoryCopy, formatTicketDate, statusFilters } from "@/lib/support/copy";
import { TicketStatusBadge } from "./TicketStatusBadge";

function filterHref(value: TicketStatus | null): string {
  return value ? `/portal/support?status=${value}` : "/portal/support";
}

function TicketRow({ ticket }: { ticket: TicketSummary }) {
  return (
    <li>
      <Link
        href={`/portal/support/${ticket.id}`}
        className="group grid gap-3 border border-border rounded-[2px] bg-horizon/60 p-5 transition-colors hover:border-lagoon/50 focus-visible:border-lagoon sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:p-6"
      >
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dust">
            <span className="tnum">{ticket.ref}</span>
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            {categoryCopy[ticket.category].label}
          </p>
          <p className="mt-2 break-words text-lg text-parchment group-hover:text-lagoon">{ticket.subject}</p>
          <p className="mt-1 text-xs text-dust">
            Last activity <time dateTime={ticket.lastMessageAt}>{formatTicketDate(ticket.lastMessageAt)}</time>
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <TicketStatusBadge status={ticket.status} />
          <span aria-hidden="true" className="text-dust transition-transform group-hover:translate-x-0.5 group-hover:text-lagoon">
            →
          </span>
        </div>
      </Link>
    </li>
  );
}

function EmptyState({ status }: { status: TicketStatus | null }) {
  return (
    <div className="hairline grid justify-items-start gap-4 rounded-[2px] bg-horizon/40 p-6 sm:p-10">
      <p className="font-display text-2xl text-parchment">
        {status ? "No requests with this status." : "You have not contacted support yet."}
      </p>
      <p className="max-w-xl text-parchment/75">
        {status
          ? "Try another filter, or start a new request if you need help."
          : "Questions about a payment, a withdrawal, KYC or one of your plans? Send us a request and our team will reply here."}
      </p>
      <ButtonLink href="/portal/support/new">New request</ButtonLink>
    </div>
  );
}

export function SupportListView({ status }: { status: TicketStatus | null }) {
  const tickets = useInfiniteQuery(ticketsQuery(status));
  const items = tickets.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="grid gap-8">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Support</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">Your requests</h1>
          <p className="mt-3 max-w-2xl text-parchment/75">
            Ask about payments, withdrawals, KYC or your plans. Our team usually replies within one working day.
          </p>
        </div>
        <ButtonLink href="/portal/support/new" className="w-full sm:w-auto">
          New request
        </ButtonLink>
      </header>

      <nav aria-label="Filter requests by status">
        <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {statusFilters.map((filter) => {
            const active = filter.value === status;
            return (
              <li key={filter.label} className="shrink-0">
                <Link
                  href={filterHref(filter.value)}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "inline-flex min-h-10 items-center rounded-full border px-4 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                    active
                      ? "border-gold/50 bg-gold/10 text-gold"
                      : "border-parchment/15 text-parchment/70 hover:border-parchment/30 hover:text-parchment",
                  )}
                >
                  {filter.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {tickets.isPending ? (
        <p className="text-dust" role="status">
          Loading your requests…
        </p>
      ) : tickets.isError && items.length === 0 ? (
        <Notice tone="error" title="We could not load your requests">
          <span className="block">{tickets.error.message}</span>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => tickets.refetch()}
            disabled={tickets.isFetching}
          >
            {tickets.isFetching ? "Retrying…" : "Try again"}
          </Button>
        </Notice>
      ) : items.length === 0 ? (
        <EmptyState status={status} />
      ) : (
        <section aria-labelledby="requests-heading" className="grid gap-4">
          <h2 id="requests-heading" className="sr-only">
            Requests
          </h2>
          <ul className="grid gap-3">
            {items.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </ul>
          {tickets.isFetchNextPageError ? (
            <Notice tone="error">We could not load more requests. Please try again.</Notice>
          ) : null}
          {tickets.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                onClick={() => tickets.fetchNextPage()}
                disabled={tickets.isFetchingNextPage}
                aria-busy={tickets.isFetchingNextPage}
              >
                {tickets.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
