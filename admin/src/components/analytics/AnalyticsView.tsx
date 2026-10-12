"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import { BarChart } from "@/components/analytics/BarChart";
import { LineChart } from "@/components/analytics/LineChart";
import { OpenQueuesCards } from "@/components/analytics/OpenQueuesCards";
import { Notice } from "@/components/ui/Notice";
import { formatMonthLabel } from "@/lib/format";
import { analyticsQueries } from "@/lib/queries/analytics";
import { ANALYTICS_MAX_MONTHS } from "@/lib/analytics/range";

type Props = {
  from: string;
  to: string;
};

function formatPct(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

function formatCount(n: number): string {
  return String(n);
}

export function AnalyticsView({ from, to }: Props) {
  const router = useRouter();

  const { data, error, isPending } = useQuery(analyticsQueries.overview({ from, to }));

  function handleRangeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newFrom = String(fd.get("from") ?? "");
    const newTo = String(fd.get("to") ?? "");
    if (!newFrom || !newTo) return;
    router.push(`?from=${encodeURIComponent(newFrom)}&to=${encodeURIComponent(newTo)}`);
  }

  const months = data?.aumBySeries.map((b) => formatMonthLabel(b.month)) ?? [];

  return (
    <div className="grid gap-8">
      <form
        onSubmit={handleRangeSubmit}
        className="flex flex-wrap items-end gap-3"
        aria-label="Date range"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="analytics-from" className="eyebrow">
            From
          </label>
          <input
            id="analytics-from"
            name="from"
            type="month"
            defaultValue={from}
            min="2020-01"
            className="hairline rounded-[3px] bg-horizon px-3 py-1.5 text-sm text-parchment"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="analytics-to" className="eyebrow">
            To
          </label>
          <input
            id="analytics-to"
            name="to"
            type="month"
            defaultValue={to}
            min="2020-01"
            className="hairline rounded-[3px] bg-horizon px-3 py-1.5 text-sm text-parchment"
            required
          />
        </div>
        <button
          type="submit"
          className="hairline rounded-[3px] bg-horizon px-3 py-1.5 text-sm text-parchment hover:bg-ink"
        >
          Apply
        </button>
        <p className="self-end text-xs text-dust">Max {ANALYTICS_MAX_MONTHS} months</p>
      </form>

      {error ? <Notice tone="error">{error.message}</Notice> : null}
      {isPending ? <p className="text-sm text-dust">Loading analytics…</p> : null}

      {data ? (
        <>
          {data.aumBySeries.length > 0 ? (
            <section aria-labelledby="analytics-aum-heading">
              <h2 id="analytics-aum-heading" className="mb-1 text-sm font-medium text-dust">
                AUM — {formatPaise(data.aumNowPaise)} today
              </h2>
              <LineChart
                title="AUM over time"
                labels={months}
                values={data.aumBySeries.map((b) => b.aum)}
                formatValue={formatPaise}
              />
            </section>
          ) : null}

          {data.moneyFlowByMonth.length > 0 ? (
            <section aria-labelledby="analytics-flow-heading">
              <h2 id="analytics-flow-heading" className="mb-1 text-sm font-medium text-dust">
                Money in vs out
              </h2>
              <BarChart
                title="Money in vs out by month"
                labels={months}
                series={[
                  { key: "in", color: "var(--color-moss)", label: "Money in" },
                  { key: "out", color: "var(--color-ember)", label: "Money out" },
                ]}
                values={{
                  in: data.moneyFlowByMonth.map((b) => b.moneyInPaise),
                  out: data.moneyFlowByMonth.map((b) => b.moneyOutPaise),
                }}
                formatValue={formatPaise}
              />
            </section>
          ) : null}

          {data.returnsByMonth.length > 0 ? (
            <section aria-labelledby="analytics-returns-heading">
              <h2 id="analytics-returns-heading" className="mb-1 text-sm font-medium text-dust">
                Returns credited
              </h2>
              <BarChart
                title="Returns credited by month"
                labels={months}
                series={[
                  { key: "gross", color: "var(--color-gold)", label: "Gross" },
                  { key: "tds", color: "var(--color-ember)", label: "TDS" },
                  { key: "net", color: "var(--color-lagoon)", label: "Net" },
                ]}
                values={{
                  gross: data.returnsByMonth.map((b) => b.grossPaise),
                  tds: data.returnsByMonth.map((b) => b.tdsPaise),
                  net: data.returnsByMonth.map((b) => b.netPaise),
                }}
                formatValue={formatPaise}
              />
            </section>
          ) : null}

          <section aria-labelledby="analytics-liabilities-heading">
            <h2 id="analytics-liabilities-heading" className="mb-3 text-sm font-medium text-dust">
              Upcoming liabilities
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  label: "Returns gross (30d)",
                  value: formatPaise(data.upcomingLiabilities.returns30GrossPaise),
                },
                {
                  label: "Returns net (30d)",
                  value: formatPaise(data.upcomingLiabilities.returns30NetPaise),
                },
                {
                  label: "Returns gross (90d)",
                  value: formatPaise(data.upcomingLiabilities.returns90GrossPaise),
                },
                {
                  label: "Returns net (90d)",
                  value: formatPaise(data.upcomingLiabilities.returns90NetPaise),
                },
                {
                  label: "Principal maturing (30d)",
                  value: formatPaise(data.upcomingLiabilities.principalMaturing30Paise),
                },
                {
                  label: "Principal maturing (90d)",
                  value: formatPaise(data.upcomingLiabilities.principalMaturing90Paise),
                },
              ].map(({ label, value }) => (
                <div key={label} className="hairline rounded-[3px] bg-horizon/60 p-4">
                  <dt className="eyebrow">{label}</dt>
                  <dd className="mt-1 font-mono text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {data.investmentsByPlan.length > 0 ? (
            <section aria-labelledby="analytics-plans-heading">
              <h2 id="analytics-plans-heading" className="mb-3 text-sm font-medium text-dust">
                Investments by plan
              </h2>
              <div className="hairline overflow-x-auto rounded-[3px]">
                <table className="data-table">
                  <caption className="sr-only">Investments by plan</caption>
                  <thead>
                    <tr>
                      <th scope="col">Plan</th>
                      <th scope="col" className="num">
                        Active count
                      </th>
                      <th scope="col" className="num">
                        Active principal
                      </th>
                      <th scope="col" className="num">
                        All-time count
                      </th>
                      <th scope="col" className="num">
                        All-time principal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.investmentsByPlan.map((row) => (
                      <tr key={row.planId}>
                        <td>{row.planName}</td>
                        <td className="num font-mono">{row.activeCount}</td>
                        <td className="num font-mono">{formatPaise(row.activePrincipalPaise)}</td>
                        <td className="num font-mono">{row.allTimeCount}</td>
                        <td className="num font-mono">{formatPaise(row.allTimePrincipalPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {data.newCustomersByMonth.length > 0 ? (
            <section aria-labelledby="analytics-new-customers-heading">
              <h2 id="analytics-new-customers-heading" className="mb-1 text-sm font-medium text-dust">
                New customers per month
              </h2>
              <BarChart
                title="New customers per month"
                labels={months}
                series={[{ key: "count", color: "var(--color-lagoon)", label: "New customers" }]}
                values={{ count: data.newCustomersByMonth.map((b) => b.count) }}
                formatValue={formatCount}
              />
            </section>
          ) : null}

          {data.leadConversionByMonth.length > 0 ? (
            <section aria-labelledby="analytics-leads-heading">
              <h2 id="analytics-leads-heading" className="mb-1 text-sm font-medium text-dust">
                Lead conversion
              </h2>
              <BarChart
                title="Lead conversion by month"
                labels={months}
                series={[
                  { key: "total", color: "var(--color-dust)", label: "Total leads" },
                  { key: "converted", color: "var(--color-gold)", label: "Converted" },
                ]}
                values={{
                  total: data.leadConversionByMonth.map((b) => b.leadsCount),
                  converted: data.leadConversionByMonth.map((b) => b.convertedCount),
                }}
                formatValue={formatCount}
              />
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-dust hover:text-parchment">Conversion rates</summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="data-table text-xs">
                    <caption className="sr-only">Lead conversion rates</caption>
                    <thead>
                      <tr>
                        <th scope="col">Month</th>
                        <th scope="col" className="num">
                          Leads
                        </th>
                        <th scope="col" className="num">
                          Converted
                        </th>
                        <th scope="col" className="num">
                          Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.leadConversionByMonth.map((b, i) => (
                        <tr key={b.month}>
                          <td>{months[i]}</td>
                          <td className="num font-mono">{b.leadsCount}</td>
                          <td className="num font-mono">{b.convertedCount}</td>
                          <td className="num font-mono">{formatPct(b.conversionRateBps)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          ) : null}

          <section aria-labelledby="analytics-queues-heading">
            <h2 id="analytics-queues-heading" className="mb-3 text-sm font-medium text-dust">
              Open queues
            </h2>
            <OpenQueuesCards queues={data.openQueues} />
          </section>
        </>
      ) : null}
    </div>
  );
}
