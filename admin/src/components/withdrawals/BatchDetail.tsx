"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import { WithdrawalStatusBadge } from "@/components/withdrawals/WithdrawalStatusBadge";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime, shortId } from "@/lib/format";
import { withdrawalQueries } from "@/lib/queries/withdrawals";

const batchTones: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  created: "neutral",
  submitted: "info",
  failed: "danger",
  unconfirmed: "warning",
};

export function BatchDetail({ batchId }: { batchId: string }) {
  const { data, error } = useQuery(withdrawalQueries.batchDetail(batchId));

  if (!data) return <Notice tone="error">{error?.message ?? "Batch not found"}</Notice>;

  const { batch: b, withdrawals } = data;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Payout batch"
        title={shortId(b.id)}
        description={`${b.count} withdrawal${b.count === 1 ? "" : "s"} · ${formatPaise(b.totalPaise)}`}
        actions={
          <>
            <Badge tone={batchTones[b.status] ?? "neutral"}>{b.status}</Badge>
            <ButtonLink href="/withdrawals/batches" variant="ghost" size="sm">
              Back to batches
            </ButtonLink>
          </>
        }
      />

      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}

      <section aria-labelledby="batch-details-heading">
        <h2 id="batch-details-heading" className="mb-3 text-sm font-semibold text-dust uppercase tracking-wide">
          Batch details
        </h2>
        <dl className="rounded-[3px] border border-border px-4">
          {(
            [
              ["Batch transfer ID", <span key="bt" className="font-mono text-xs">{b.batchTransferId}</span>],
              ["Cashfree batch ID", b.cfBatchId ? <span key="cf" className="font-mono text-xs">{b.cfBatchId}</span> : "—"],
              ["Status", <Badge key="st" tone={batchTones[b.status] ?? "neutral"}>{b.status}</Badge>],
              ["Total", formatPaise(b.totalPaise)],
              ["Count", String(b.count)],
              ["Created by", b.createdBy ? b.createdBy.slice(0, 8) : "—"],
              ["Created", formatDateTime(b.createdAt)],
              ["Updated", formatDateTime(b.updatedAt)],
              b.failureReason ? ["Failure reason", b.failureReason] : null,
            ] as ([string, React.ReactNode] | null)[]
          )
            .filter((row): row is [string, React.ReactNode] => Boolean(row))
            .map(([label, value]) => (
              <div key={String(label)} className="grid grid-cols-[10rem_1fr] gap-x-4 border-b border-border py-2 text-sm last:border-0">
                <dt className="text-dust">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      </section>

      <section aria-labelledby="batch-withdrawals-heading">
        <h2 id="batch-withdrawals-heading" className="mb-3 text-sm font-semibold text-dust uppercase tracking-wide">
          Withdrawals ({withdrawals.length})
        </h2>
        {withdrawals.length === 0 ? (
          <p className="text-sm text-dust">No withdrawals in this batch.</p>
        ) : (
          <div className="hairline overflow-x-auto rounded-[3px]">
            <table className="data-table">
              <caption className="sr-only">Withdrawals in this batch</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Customer</th>
                  <th scope="col" className="num">Amount</th>
                  <th scope="col">Account</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <Link href={`/withdrawals/${w.id}`} className="font-mono text-xs hover:text-gold">
                        {shortId(w.id)}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/customers/${w.customerId}`} className="font-mono text-xs hover:text-gold">
                        {shortId(w.customerId)}
                      </Link>
                    </td>
                    <td className="num">{formatPaise(w.amountPaise)}</td>
                    <td className="font-mono text-xs">{w.destination.accountMasked}</td>
                    <td><WithdrawalStatusBadge status={w.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
