"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import type { PayoutBatch } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/desk/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { formatDateTime, shortId } from "@/lib/format";
import { withdrawalQueries } from "@/lib/queries/withdrawals";

const batchTones: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  created: "neutral",
  submitted: "info",
  failed: "danger",
  unconfirmed: "warning",
};

function BatchRow({ batch: b }: { batch: PayoutBatch }) {
  return (
    <tr>
      <td>
        <Link href={`/withdrawals/batches/${b.id}`} className="font-mono text-xs hover:text-gold">
          {shortId(b.id)}
        </Link>
      </td>
      <td className="font-mono text-xs text-dust">{b.batchTransferId}</td>
      <td className="num">{formatPaise(b.totalPaise)}</td>
      <td className="num">{b.count}</td>
      <td>
        <Badge tone={batchTones[b.status] ?? "neutral"}>{b.status}</Badge>
      </td>
      <td className="text-xs text-dust">{formatDateTime(b.createdAt)}</td>
    </tr>
  );
}

export function BatchesTable() {
  const { data, error, isPending, isFetching, hasNextPage, fetchNextPage } = useInfiniteQuery(
    withdrawalQueries.batchList(),
  );

  if (isPending) return <p className="text-sm text-dust">Loading batches…</p>;
  if (error && !data) return <Notice tone="error">{error.message}</Notice>;

  const batches = data?.pages.flatMap((p) => p.batches) ?? [];

  if (batches.length === 0) return <EmptyState>No payout batches yet.</EmptyState>;

  return (
    <div className="grid gap-2">
      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <caption className="sr-only">Payout batches</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Batch transfer ID</th>
              <th scope="col" className="num">Total</th>
              <th scope="col" className="num">Count</th>
              <th scope="col">Status</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => <BatchRow key={b.id} batch={b} />)}
          </tbody>
        </table>
      </div>
      {hasNextPage ? (
        <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} disabled={isFetching}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}
