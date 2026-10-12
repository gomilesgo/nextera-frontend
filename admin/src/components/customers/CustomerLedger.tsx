"use client";

import { formatPaise } from "@nextera/contracts";
import { LedgerExportButton } from "@/components/customers/LedgerExportButton";
import { Pagination } from "@/components/listing/Pagination";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { ledgerFiltersSearch, parseLedgerFilters } from "@/lib/customers/filters";
import { useCustomer, useCustomerLedger, useUrlState } from "@/lib/customers/hooks";
import { accountLabel, causeLabel } from "@/lib/customers/labels";
import { formatDateTime, shortId } from "@/lib/format";
import { cx } from "@/lib/cx";

export function CustomerLedger({ customerId }: { customerId: string }) {
  const { value: filters, navigate } = useUrlState(parseLedgerFilters);
  const { data: detail } = useCustomer(customerId);
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useCustomerLedger(customerId, filters);

  const accounts = Array.from(
    new Set([...(detail?.balances.map((balance) => balance.account) ?? []), ...(filters.account ? [filters.account] : [])]),
  ).sort();

  return (
    <section aria-labelledby="ledger-heading" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="ledger-heading" className="text-base font-semibold tracking-tight">
            Ledger
          </h2>
          <p className="mt-1 text-sm text-dust">
            Newest first. The running balance is per account, after each entry.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field name="account" label="Account" className="w-56">
            <SelectInput
              name="account"
              value={filters.account ?? ""}
              onChange={(event) =>
                navigate(ledgerFiltersSearch({ ...filters, account: event.target.value || undefined, offset: 0 }))
              }
            >
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account} value={account}>
                  {accountLabel(account)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <LedgerExportButton customerId={customerId} account={filters.account} />
        </div>
      </div>

      {error && !data ? (
        <Notice tone="error">
          <span className="flex flex-wrap items-center justify-between gap-2">
            {error.message}
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          </span>
        </Notice>
      ) : null}

      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <caption className="sr-only">
            Ledger entries{filters.account ? ` for ${accountLabel(filters.account)}` : ""}
          </caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Account</th>
              <th scope="col" className="num">
                Debit
              </th>
              <th scope="col" className="num">
                Credit
              </th>
              <th scope="col" className="num">
                Running balance
              </th>
              <th scope="col">Memo</th>
              <th scope="col">Cause</th>
            </tr>
          </thead>
          <tbody className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
            {isPending ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-dust">
                  Loading ledger…
                </td>
              </tr>
            ) : data && data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-dust">
                  No ledger entries{filters.account ? " for this account" : " yet"}.
                </td>
              </tr>
            ) : (
              data?.items.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap text-dust">{formatDateTime(entry.at)}</td>
                  <td className="whitespace-nowrap">{accountLabel(entry.account)}</td>
                  <td className="num text-ember">{entry.direction === "debit" ? formatPaise(entry.amountPaise) : ""}</td>
                  <td className="num text-moss">{entry.direction === "credit" ? formatPaise(entry.amountPaise) : ""}</td>
                  <td className={cx("num font-medium", entry.runningBalancePaise < 0 && "text-ember")}>
                    {formatPaise(entry.runningBalancePaise)}
                  </td>
                  <td className="max-w-72 break-words">{entry.description || <span className="text-dust">—</span>}</td>
                  <td className="whitespace-nowrap">
                    {causeLabel(entry.refType)}
                    <div className="font-mono text-xs text-dust" title={`Transaction ${entry.transactionId}`}>
                      {shortId(entry.transactionId)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        label="Ledger entries"
        window={filters}
        total={data?.total ?? 0}
        busy={isFetching}
        onOffset={(offset) => navigate(ledgerFiltersSearch({ ...filters, offset }))}
      />
      <p aria-live="polite" className="min-h-4 text-xs text-ember">
        {error && data ? `Showing earlier entries: ${error.message}` : ""}
      </p>
    </section>
  );
}
