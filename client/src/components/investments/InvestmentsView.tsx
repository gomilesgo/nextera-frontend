"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatBps, formatPaise } from "@nextera/contracts";
import type { Investment } from "@nextera/contracts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { formatIsoDate } from "@/lib/dates";
import { formatTenure } from "@/lib/plans";
import { investmentsQuery } from "@/lib/queries/investments";
import { InvestmentStatusBadge } from "./InvestmentStatusBadge";

function nextHref(investment: Investment): string {
  if (investment.status === "pending_payment") return `/portal/invest/${investment.id}`;
  return `/portal/investments/${investment.id}`;
}

function InvestmentCard({ investment }: { investment: Investment }) {
  const pending = investment.status === "pending_payment";
  return (
    <article className="hairline flex h-full flex-col rounded-[2px] bg-horizon p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl">
            <Link href={nextHref(investment)} className="hover:text-gold">
              {investment.planName}
            </Link>
          </h2>
          {investment.bondNo ? <p className="mt-1 font-mono text-xs text-dust">{investment.bondNo}</p> : null}
        </div>
        <InvestmentStatusBadge status={investment.status} />
      </div>
      <p className="mt-5 font-display text-3xl text-gold tnum">{formatPaise(investment.principalPaise)}</p>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="label">Rate</dt>
          <dd className="mt-1 tnum">{formatBps(investment.rateBps)}</dd>
        </div>
        <div>
          <dt className="label">Tenure</dt>
          <dd className="mt-1 tnum">{formatTenure(investment.tenureMonths)}</dd>
        </div>
        <div>
          <dt className="label">Monthly</dt>
          <dd className="mt-1 tnum">{formatPaise(investment.monthlyReturnPaise)}</dd>
        </div>
        <div>
          <dt className="label">{investment.maturityDate ? "Matures" : "Started"}</dt>
          <dd className="mt-1 tnum">
            {investment.maturityDate ? formatIsoDate(investment.maturityDate) : pending ? "On payment" : "—"}
          </dd>
        </div>
      </dl>
      <div className="mt-auto pt-6">
        <ButtonLink href={nextHref(investment)} variant={pending ? "gold" : "ghost"} size="sm" className="w-full sm:w-auto">
          {pending ? (investment.consentedAt ? "Complete payment" : "Continue") : "View details"}
          <span className="sr-only"> for {investment.planName}</span>
        </ButtonLink>
      </div>
    </article>
  );
}

export function InvestmentsView() {
  const investments = useQuery(investmentsQuery());

  return (
    <div className="grid gap-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Investments</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">Your investments</h1>
          <p className="mt-3 max-w-2xl text-parchment/75">Every plan you hold, what it pays and when it matures.</p>
        </div>
        <ButtonLink href="/portal/plans" variant="ghost">
          Explore plans
        </ButtonLink>
      </header>

      {investments.isPending ? (
        <p className="min-h-[16rem] text-dust" role="status">
          Loading your investments…
        </p>
      ) : investments.isError ? (
        <Notice tone="error" title="We could not load your investments">
          <span className="block">{investments.error.message}</span>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => investments.refetch()} disabled={investments.isFetching}>
            {investments.isFetching ? "Retrying…" : "Try again"}
          </Button>
        </Notice>
      ) : investments.data.investments.length === 0 ? (
        <section className="hairline grid justify-items-start gap-4 rounded-[2px] p-8">
          <h2 className="font-display text-2xl">No investments yet</h2>
          <p className="max-w-xl text-parchment/75">
            Choose a plan, see exactly what it pays each month, and invest online once your KYC is verified.
          </p>
          <ButtonLink href="/portal/plans">See open plans</ButtonLink>
        </section>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {investments.data.investments.map((investment) => (
            <li key={investment.id}>
              <InvestmentCard investment={investment} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
