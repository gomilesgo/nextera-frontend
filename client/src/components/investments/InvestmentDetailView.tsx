"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatBps, formatPaise } from "@nextera/contracts";
import type { GrowthPeriod } from "@nextera/contracts";
import { PortalNotFoundPanel } from "@/components/portal/PortalNotFoundPanel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ApiError } from "@/lib/api/errors";
import { cx } from "@/lib/cx";
import { formatIsoDate, todayInIndia } from "@/lib/dates";
import { growthPoints } from "@/lib/investmentGrowth";
import { formatTenure } from "@/lib/plans";
import { investmentQuery } from "@/lib/queries/investments";
import { DocumentList } from "./DocumentList";
import { InvestmentGrowthChart } from "./InvestmentGrowthChart";
import { InvestmentStatusBadge } from "./InvestmentStatusBadge";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="label">{label}</dt>
      <dd className="mt-2 text-xl text-parchment tnum sm:text-2xl">{value}</dd>
      {sub ? <dd className="mt-1 text-xs text-dust">{sub}</dd> : null}
    </div>
  );
}

function ScheduleRows({ schedule, indicative }: { schedule: GrowthPeriod[]; indicative: boolean }) {
  return (
    <div
      className="max-h-96 overflow-auto border-t border-border focus-visible:ring-2 focus-visible:ring-lagoon/60"
      tabIndex={0}
      role="region"
      aria-label="Monthly credit schedule"
    >
      <table className="data-table text-sm">
        <caption className="sr-only">Monthly credits, credited and projected</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Due</th>
            <th scope="col">Status</th>
            <th scope="col" className="num">
              Return
            </th>
            <th scope="col" className="num">
              Credited after TDS
            </th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((period) => (
            <tr key={period.periodNo}>
              <td className="font-mono text-dust tnum">{period.periodNo}</td>
              <td className="whitespace-nowrap">{formatIsoDate(period.dueDate)}</td>
              <td className={cx("whitespace-nowrap", period.credited ? "text-moss" : "text-dust")}>
                {period.credited ? "Credited" : indicative ? "Indicative" : "Upcoming"}
              </td>
              <td className="num">{formatPaise(period.grossPaise)}</td>
              <td className="num">{period.netPaise === null ? "—" : formatPaise(period.netPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InvestmentDetailView({ investmentId }: { investmentId: string }) {
  const detail = useQuery(investmentQuery(investmentId));

  if (!detail.data) {
    if (detail.error instanceof ApiError && detail.error.status === 404) return <PortalNotFoundPanel />;
    return detail.isError ? (
      <Notice tone="error" title="We could not load this investment">
        <span className="block">{detail.error.message}</span>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => detail.refetch()} disabled={detail.isFetching}>
          {detail.isFetching ? "Retrying…" : "Try again"}
        </Button>
      </Notice>
    ) : (
      <p className="min-h-[60vh] text-dust" role="status">
        Loading your investment…
      </p>
    );
  }

  const { investment, growth, documents, payment } = detail.data;
  const points = growthPoints(growth, investment.startDate ?? todayInIndia());
  const bondReady = documents.some((document) => document.kind === "bond");

  return (
    <div className="grid gap-10">
      <Link href="/portal/investments" className="inline-flex items-center gap-2 text-sm text-dust hover:text-parchment">
        <span aria-hidden="true">←</span> All investments
      </Link>

      <header className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow">Investment</p>
          <InvestmentStatusBadge status={investment.status} />
        </div>
        <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">{investment.planName}</h1>
        {investment.bondNo ? (
          <p className="font-mono text-sm text-dust">
            Bond <span className="text-parchment">{investment.bondNo}</span>
          </p>
        ) : null}
      </header>

      {investment.status === "pending_payment" ? (
        <Notice tone="info" title="This investment is waiting for payment">
          <span className="block">
            {payment && payment.status === "created"
              ? "A payment has been started. Check its status before paying again."
              : "Finish your agreement and payment to activate it."}
          </span>
          <ButtonLink
            href={payment && payment.status === "created" ? `/portal/invest/${investment.id}/status` : `/portal/invest/${investment.id}`}
            size="sm"
            className="mt-3"
          >
            {payment && payment.status === "created" ? "Check payment status" : "Continue"}
          </ButtonLink>
        </Notice>
      ) : null}

      {investment.status === "active" && !bondReady ? (
        <Notice tone="info">Your bond certificate is being issued. It will appear under Documents shortly.</Notice>
      ) : null}

      <dl className="hairline grid grid-cols-2 gap-6 rounded-[2px] bg-horizon p-6 sm:p-8 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <dt className="label">Principal</dt>
          <dd className="mt-2 font-display text-[clamp(2rem,5vw,2.75rem)] leading-none text-gold tnum">
            {formatPaise(investment.principalPaise)}
          </dd>
        </div>
        <Stat label="Rate" value={formatBps(investment.rateBps)} sub="a year, simple interest" />
        <Stat label="Tenure" value={formatTenure(investment.tenureMonths)} />
        <Stat label="Monthly return" value={formatPaise(investment.monthlyReturnPaise)} sub="before TDS" />
        <Stat label="Start date" value={investment.startDate ? formatIsoDate(investment.startDate) : "On payment"} />
        <Stat label="Maturity date" value={investment.maturityDate ? formatIsoDate(investment.maturityDate) : "—"} />
        <Stat
          label="Credited so far"
          value={formatPaise(growth.creditedNetPaise)}
          sub={`${growth.periodsCredited} of ${investment.tenureMonths} months${growth.tdsPaise > 0 ? `, after ${formatPaise(growth.tdsPaise)} TDS` : ""}`}
        />
        <Stat
          label="Next credit"
          value={growth.nextCreditPaise !== null ? formatPaise(growth.nextCreditPaise) : "—"}
          sub={growth.nextCreditDate ? `before TDS, due ${formatIsoDate(growth.nextCreditDate)}` : undefined}
        />
      </dl>

      <section aria-labelledby="growth-heading" className="hairline grid gap-6 rounded-[2px] p-5 sm:p-8">
        <div>
          <h2 id="growth-heading" className="font-display text-2xl">
            Growth
          </h2>
          {growth.scheduleIsIndicative ? (
            <p className="mt-2 text-sm text-dust">
              Indicative: the schedule starts on the day your payment is confirmed.
            </p>
          ) : null}
        </div>
        <div className="grid items-start gap-8 xl:grid-cols-[1.1fr_1fr]">
          <div className="min-w-0 max-w-3xl">
            <InvestmentGrowthChart points={points} indicative={growth.scheduleIsIndicative} />
          </div>
          <ScheduleRows schedule={growth.schedule} indicative={growth.scheduleIsIndicative} />
        </div>
      </section>

      <section aria-labelledby="documents-heading" className="grid gap-4">
        <h2 id="documents-heading" className="font-display text-2xl">
          Documents
        </h2>
        {documents.length === 0 ? (
          <p className="text-dust">No documents yet.</p>
        ) : (
          <DocumentList documents={documents} />
        )}
      </section>
    </div>
  );
}
