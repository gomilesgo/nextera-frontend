"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import { EmptyState } from "@/components/desk/EmptyState";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ApiError } from "@/lib/queries/fetchJson";
import { payablesKeys, payablesQueries } from "@/lib/queries/payables";
import type { SortOption } from "@/lib/queries/payables";

const sortLabels: Record<SortOption, string> = {
  totalPayable_desc: "Largest first",
  totalPayable_asc: "Smallest first",
};

export function PayablesCustomersTable() {
  const [sort, setSort] = useState<SortOption>("totalPayable_desc");
  const queryClient = useQueryClient();

  const { data, error, isPending, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery(payablesQueries.customers(sort));

  const rows = data?.pages.flatMap((page) => page.customers) ?? [];
  const isCursorError = error instanceof ApiError && error.status === 400 && rows.length > 0;

  if (isPending) return <p className="text-sm text-dust">Loading customers…</p>;
  if (error && rows.length === 0) return <Notice tone="error">{error.message}</Notice>;

  if (rows.length === 0) {
    return <EmptyState>No customers with outstanding payables.</EmptyState>;
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        <label htmlFor="payables-sort" className="text-xs text-dust">
          Sort
        </label>
        <select
          id="payables-sort"
          className="hairline rounded-[3px] bg-horizon px-2 py-1 text-xs text-parchment"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
        >
          {(Object.entries(sortLabels) as [SortOption, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <caption className="sr-only">Customers with outstanding payables</caption>
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">Phone</th>
              <th scope="col" className="num">
                Wallet
              </th>
              <th scope="col" className="num">
                Pending withdrawal
              </th>
              <th scope="col" className="num">
                Returns 30d (gross)
              </th>
              <th scope="col" className="num">
                Returns 30d (net)
              </th>
              <th scope="col" className="num">
                Principal 30d
              </th>
              <th scope="col" className="num">
                Principal 90d
              </th>
              <th scope="col" className="num">
                Total payable
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.customerId}>
                <td>
                  <Link href={`/customers/${row.customerId}`} className="hover:text-gold">
                    {row.name ?? (
                      <span className="font-mono text-xs text-dust">{row.customerId.slice(0, 8)}</span>
                    )}
                  </Link>
                </td>
                <td className="font-mono text-xs">{row.phoneMasked}</td>
                <td className="num font-mono">{formatPaise(row.walletPaise)}</td>
                <td className="num font-mono">{formatPaise(row.pendingWithdrawalPaise)}</td>
                <td className="num font-mono">{formatPaise(row.returnsDue30.grossPaise)}</td>
                <td className="num font-mono">{formatPaise(row.returnsDue30.netPaise)}</td>
                <td className="num font-mono">{formatPaise(row.principalMaturing30Paise)}</td>
                <td className="num font-mono">{formatPaise(row.principalMaturing90Paise)}</td>
                <td className="num font-mono font-medium">{formatPaise(row.totalPayablePaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-xs text-dust">
        <p aria-live="polite">
          {`Showing ${rows.length} ${rows.length === 1 ? "customer" : "customers"}${hasNextPage ? "" : ", that is all of them"}.`}
        </p>
        {hasNextPage ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            aria-busy={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Show more"}
          </Button>
        ) : null}
      </div>
      {isCursorError ? (
        <div className="flex items-center gap-3 text-xs text-ember">
          <span>Pagination cursor is no longer valid.</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              queryClient.removeQueries({ queryKey: payablesKeys.customerLists() });
            }}
          >
            Reset to first page
          </Button>
        </div>
      ) : error ? (
        <p className="text-xs text-ember">Showing cached data: {error.message}</p>
      ) : null}
    </div>
  );
}
