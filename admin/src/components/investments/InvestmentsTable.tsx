"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { formatBps, formatPaise } from "@nextera/contracts";
import { InvestmentStatusBadge } from "@/components/investments/InvestmentStatusBadge";
import { CustomerLink } from "@/components/payments/CustomerLink";
import { EmptyState } from "@/components/desk/EmptyState";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { formatDateTime, formatIsoDate } from "@/lib/format";
import type { InvestmentListFilters } from "@/lib/investments/filters";
import { tenureLabel } from "@/lib/investments/labels";
import { investmentQueries } from "@/lib/queries/investments";

export function InvestmentsTable({ filters, filtered }: { filters: InvestmentListFilters; filtered: boolean }) {
  const { data, error, isPending, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery(
    investmentQueries.list(filters),
  );

  if (isPending) return <p className="text-sm text-dust">Loading investments…</p>;
  if (error && !data) return <Notice tone="error">{error.message}</Notice>;

  const investments = data?.pages.flatMap((page) => page.investments) ?? [];

  if (investments.length === 0) {
    return (
      <EmptyState>{filtered ? "No investments match these filters." : "No investments have been created yet."}</EmptyState>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <caption className="sr-only">Investments, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Bond no.</th>
              <th scope="col">Customer</th>
              <th scope="col">Plan</th>
              <th scope="col" className="num">
                Principal
              </th>
              <th scope="col" className="num">
                Rate
              </th>
              <th scope="col">Tenure</th>
              <th scope="col">Start / maturity</th>
              <th scope="col">Status</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {investments.map((investment) => (
              <tr key={investment.id}>
                <td>
                  <Link href={`/investments/${investment.id}`} className="font-mono font-medium hover:text-gold">
                    {investment.bondNo ?? (
                      <>
                        <span className="text-dust">Not issued</span>
                        <span className="sr-only">
                          {`: ${investment.planName}, ${formatPaise(investment.principalPaise)}, created ${formatDateTime(investment.createdAt)}`}
                        </span>
                      </>
                    )}
                  </Link>
                </td>
                <td>
                  <CustomerLink customerId={investment.customerId} label={investment.customerName} />
                </td>
                <td>{investment.planName}</td>
                <td className="num font-mono">{formatPaise(investment.principalPaise)}</td>
                <td className="num font-mono">{formatBps(investment.rateBps)}</td>
                <td className="whitespace-nowrap">{tenureLabel(investment.tenureMonths)}</td>
                <td className="whitespace-nowrap text-dust">
                  {investment.startDate ? (
                    <>
                      {formatIsoDate(investment.startDate)}
                      <span aria-hidden="true"> → </span>
                      <span className="sr-only"> to </span>
                      {investment.maturityDate ? formatIsoDate(investment.maturityDate) : "—"}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <InvestmentStatusBadge status={investment.status} />
                </td>
                <td className="whitespace-nowrap text-dust">{formatDateTime(investment.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-xs text-dust">
        <p aria-live="polite">
          Showing {investments.length} {investments.length === 1 ? "investment" : "investments"}, newest first.
        </p>
        {hasNextPage ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            aria-busy={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}
    </div>
  );
}
