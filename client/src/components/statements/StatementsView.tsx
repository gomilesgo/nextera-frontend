"use client";

import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { cx } from "@/lib/cx";
import { formatDateTime } from "@/lib/datetime";
import { investmentsQuery } from "@/lib/queries/investments";
import { statementsQuery } from "@/lib/queries/statements";
import { accountLabel, describeEntry, signedAmount } from "@/lib/statements";

export function StatementsView() {
  const statements = useInfiniteQuery(statementsQuery());
  const investments = useQuery(investmentsQuery());
  const planNames = useMemo(
    () => new Map((investments.data?.investments ?? []).map((investment) => [investment.id, investment.planName])),
    [investments.data],
  );
  const entries = statements.data?.pages.flatMap((page) => page.entries) ?? [];

  return (
    <div className="grid gap-10">
      <header>
        <p className="eyebrow">Statements</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">Account statement</h1>
        <p className="mt-3 max-w-2xl text-parchment/75">
          Every movement on your Nextera accounts, newest first: money invested, monthly returns and principal at maturity.
        </p>
      </header>

      {statements.isPending ? (
        <p className="min-h-[16rem] text-dust" role="status">
          Loading your statement…
        </p>
      ) : statements.isError && entries.length === 0 ? (
        <Notice tone="error" title="We could not load your statement">
          <span className="block">{statements.error.message}</span>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => statements.refetch()} disabled={statements.isFetching}>
            {statements.isFetching ? "Retrying…" : "Try again"}
          </Button>
        </Notice>
      ) : entries.length === 0 ? (
        <section className="hairline grid justify-items-start gap-4 rounded-[2px] p-8">
          <h2 className="font-display text-2xl">Nothing here yet</h2>
          <p className="max-w-xl text-parchment/75">Movements appear once your first investment is paid.</p>
          <ButtonLink href="/portal/plans">See open plans</ButtonLink>
        </section>
      ) : (
        <section aria-labelledby="movements-heading" className="grid gap-6">
          <h2 id="movements-heading" className="sr-only">
            Movements
          </h2>
          <div className="hairline overflow-x-auto rounded-[2px]">
            <table className="data-table text-sm">
              <caption className="sr-only">Account movements, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col" className="hidden sm:table-cell">
                    Account
                  </th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const description = describeEntry(entry, planNames);
                  return (
                    <tr key={entry.id}>
                      <td className="align-top text-dust tnum">{formatDateTime(entry.createdAt)}</td>
                      <td className="align-top">
                        <span className="block text-parchment">{description.title}</span>
                        {description.detail ? <span className="block text-xs text-dust">{description.detail}</span> : null}
                        <span className="block text-xs text-dust sm:hidden">{accountLabel(entry.account)}</span>
                      </td>
                      <td className="hidden align-top text-dust sm:table-cell">{accountLabel(entry.account)}</td>
                      <td className={cx("num align-top", entry.direction === "credit" ? "text-moss" : "text-parchment")}>
                        <span className="sr-only">{entry.direction === "credit" ? "Credit " : "Debit "}</span>
                        {signedAmount(entry)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center gap-3" aria-live="polite">
            {statements.isFetchNextPageError ? (
              <p className="text-sm text-ember">We could not load more movements. Please try again.</p>
            ) : null}
            {statements.hasNextPage ? (
              <Button
                variant="ghost"
                onClick={() => statements.fetchNextPage()}
                disabled={statements.isFetchingNextPage}
                aria-busy={statements.isFetchingNextPage}
              >
                {statements.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            ) : (
              <p className="text-xs text-dust">You have reached the start of your statement.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
