"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/desk/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { formatDateTime } from "@/lib/format";
import { FLAG_LOOKUP_LIMIT, FLAG_PAGE_SIZE, hasMorePayments, nextPaymentLimit } from "@/lib/payments/filters";
import type { FlagState } from "@/lib/payments/filters";
import { eventSourceLabels, flagReasonLabels, resolutionLabels } from "@/lib/payments/labels";
import { paymentQueries } from "@/lib/queries/payments";

const emptyMessages: Record<FlagState, string> = {
  open: "No payment flags need attention.",
  resolved: "No payment flags have been resolved yet.",
};

export function FlagsTable({ state }: { state: FlagState }) {
  const [limit, setLimit] = useState(FLAG_PAGE_SIZE);
  const { data, error, isPending, isFetching, isPlaceholderData } = useQuery(paymentQueries.flagList({ state, limit }));

  if (isPending) return <p className="text-sm text-dust">Loading payment flags…</p>;
  if (error && !data) return <Notice tone="error">{error.message}</Notice>;

  const flags = data?.flags ?? [];

  if (flags.length === 0) return <EmptyState>{emptyMessages[state]}</EmptyState>;

  return (
    <div className="grid gap-2">
      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <caption className="sr-only">{state === "open" ? "Open" : "Resolved"} payment flags, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Reason</th>
              <th scope="col">Detail</th>
              <th scope="col">Order</th>
              <th scope="col">Source</th>
              <th scope="col">Raised</th>
              {state === "resolved" ? <th scope="col">Resolution</th> : null}
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <tr key={flag.id}>
                <td>
                  <Link href={`/payment-flags/${flag.id}`} className="font-medium hover:text-gold">
                    {flag.flagReason ? flagReasonLabels[flag.flagReason] : flag.type}
                  </Link>
                </td>
                <td className="max-w-80 text-xs break-words text-dust">{flag.flagDetail ?? "—"}</td>
                <td className="font-mono text-xs">{flag.orderId ?? "—"}</td>
                <td>
                  <Badge tone="info">{eventSourceLabels[flag.source]}</Badge>
                </td>
                <td className="whitespace-nowrap text-dust">{formatDateTime(flag.receivedAt)}</td>
                {state === "resolved" ? (
                  <td className="text-xs">
                    {flag.resolutionType ? resolutionLabels[flag.resolutionType] : "Resolved"}
                    <div className="whitespace-nowrap text-dust">{formatDateTime(flag.resolvedAt)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-xs text-dust">
        <p aria-live="polite">
          {flags.length >= FLAG_LOOKUP_LIMIT
            ? `Showing the newest ${FLAG_LOOKUP_LIMIT} flags.`
            : `Showing ${flags.length} ${flags.length === 1 ? "flag" : "flags"}, newest first.`}
        </p>
        {hasMorePayments(flags.length, limit) ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLimit(nextPaymentLimit(limit))}
            disabled={isPlaceholderData}
            aria-busy={isPlaceholderData}
          >
            {isPlaceholderData ? "Loading…" : "Show more"}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}
    </div>
  );
}
