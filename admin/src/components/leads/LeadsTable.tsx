"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/desk/EmptyState";
import { LoadMore } from "@/components/desk/LoadMore";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/Notice";
import { formatDateTime } from "@/lib/format";
import type { LeadListParams } from "@/lib/leads/filters";
import { leadSourceLabels, leadStatusLabels, leadStatusTones } from "@/lib/leads/labels";
import { leadQueries } from "@/lib/queries/leads";

export function LeadsTable({ params, filtered }: { params: LeadListParams; filtered: boolean }) {
  const { data, error, isPending, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, isPlaceholderData } =
    useInfiniteQuery(leadQueries.list(params));

  if (isPending) return <p className="text-sm text-dust">Loading leads…</p>;
  if (error && !data) return <Notice tone="error">{error.message}</Notice>;

  const leads = data?.pages.flatMap((page) => page.items) ?? [];

  if (leads.length === 0) {
    return <EmptyState>{filtered ? "No leads match these filters." : "No leads yet. Website enquiries appear here."}</EmptyState>;
  }

  return (
    <div className="grid gap-2">
      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <caption className="sr-only">Leads, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Lead</th>
              <th scope="col">Contact</th>
              <th scope="col">Interest</th>
              <th scope="col">Status</th>
              <th scope="col">Assignee</th>
              <th scope="col">Source</th>
              <th scope="col">Received</th>
            </tr>
          </thead>
          <tbody className={isPlaceholderData ? "opacity-60" : undefined}>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <Link href={`/leads/${lead.id}`} className="font-medium hover:text-gold">
                    {lead.name}
                  </Link>
                  <div className="font-mono text-xs text-dust">{lead.ref}</div>
                </td>
                <td>
                  <span className="font-mono">{lead.phone}</span>
                  {lead.email ? <div className="max-w-56 truncate text-xs text-dust">{lead.email}</div> : null}
                </td>
                <td className="max-w-56 text-dust">{lead.interest ?? "—"}</td>
                <td>
                  <Badge tone={leadStatusTones[lead.status]}>{leadStatusLabels[lead.status]}</Badge>
                </td>
                <td>{lead.assignee?.name ?? <span className="text-dust">Unassigned</span>}</td>
                <td className="whitespace-nowrap text-dust">{leadSourceLabels[lead.source]}</td>
                <td className="whitespace-nowrap text-dust">{formatDateTime(lead.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LoadMore
        count={leads.length}
        hasMore={Boolean(hasNextPage)}
        loading={isFetchingNextPage}
        onMore={() => void fetchNextPage()}
        noun={{ one: "lead", many: "leads" }}
      />
      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}
    </div>
  );
}
