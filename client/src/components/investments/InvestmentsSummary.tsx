"use client";

import { useQuery } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatIsoDate } from "@/lib/dates";
import { investmentSummaryQuery } from "@/lib/queries/investments";

function Figure({ label, value, sub, lead }: { label: string; value: string; sub?: string; lead?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="label">{label}</dt>
      <dd className={lead ? "mt-2 font-display text-4xl leading-none text-gold tnum" : "mt-2 text-2xl text-parchment tnum"}>{value}</dd>
      {sub ? <dd className="mt-1 text-xs text-dust">{sub}</dd> : null}
    </div>
  );
}

export function InvestmentsSummary() {
  const summary = useQuery(investmentSummaryQuery());
  const data = summary.data?.summary;

  return (
    <section aria-labelledby="investments-summary-heading" className="hairline grid gap-6 rounded-[2px] bg-horizon p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="investments-summary-heading" className="label">
          Your investments
        </h2>
        <ButtonLink href="/portal/investments" variant="ghost" size="sm">
          View all
        </ButtonLink>
      </div>
      <div className="min-h-[5.5rem]">
        {summary.isPending ? (
          <p className="text-dust" role="status">
            Loading your investments…
          </p>
        ) : summary.isError || !data ? (
          <p className="text-parchment/75">
            Your investment totals are taking a moment to load.{" "}
            <Button variant="quiet" size="sm" className="px-2" onClick={() => summary.refetch()} disabled={summary.isFetching}>
              Try again
            </Button>
          </p>
        ) : data.activeCount + data.maturedCount + data.pendingCount === 0 ? (
          <p className="max-w-xl text-parchment/75">
            You have not invested yet. Once you do, your invested amount and every monthly credit appear here.
          </p>
        ) : (
          <dl className="grid gap-6 sm:grid-cols-3">
            <Figure
              label="Total invested"
              value={formatPaise(data.investedPaise)}
              sub={`${data.activeCount} active${data.pendingCount ? `, ${data.pendingCount} awaiting payment` : ""}`}
              lead
            />
            <Figure
              label="Returns credited"
              value={formatPaise(data.creditedNetPaise)}
              sub={!data.complete ? "across your most recent investments" : data.tdsPaise > 0 ? `after ${formatPaise(data.tdsPaise)} TDS` : "to your wallet"}
            />
            <Figure
              label="Next credit"
              value={data.nextCredit ? formatPaise(data.nextCredit.paise) : "—"}
              sub={data.nextCredit ? `before TDS · ${formatIsoDate(data.nextCredit.date)} · ${data.nextCredit.planName}` : undefined}
            />
          </dl>
        )}
      </div>
    </section>
  );
}
