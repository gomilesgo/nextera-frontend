"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatBps, formatPaise, monthlyReturnPaise } from "@nextera/contracts";
import { ReturnsCalculator } from "@/components/calculator/ReturnsCalculator";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ApiError } from "@/lib/api/errors";
import { formatTenure } from "@/lib/plans";
import { meQuery, planQuery } from "@/lib/queries/options";
import { InvestPanel } from "./InvestPanel";
import { PortalNotFoundPanel } from "./PortalNotFoundPanel";

export function PlanDetailView({
  slug,
  startDate,
  initialAmountPaise,
}: {
  slug: string;
  startDate: string;
  initialAmountPaise?: number;
}) {
  const planResult = useQuery(planQuery(slug));
  const me = useQuery(meQuery());
  const plan = planResult.data?.plan;

  const back = (
    <Link href="/portal/plans" className="inline-flex items-center gap-2 text-sm text-dust hover:text-parchment">
      <span aria-hidden="true">←</span> All plans
    </Link>
  );

  if (!plan && planResult.error instanceof ApiError && planResult.error.status === 404) {
    return <PortalNotFoundPanel />;
  }

  if (!plan) {
    return (
      <div className="grid gap-6">
        {back}
        {planResult.isError ? (
          <Notice tone="error" title={planResult.error.message}>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => planResult.refetch()} disabled={planResult.isFetching}>
              {planResult.isFetching ? "Retrying…" : "Try again"}
            </Button>
          </Notice>
        ) : (
          <p className="text-dust" role="status">
            Loading plan…
          </p>
        )}
      </div>
    );
  }

  const initialAmount =
    initialAmountPaise !== undefined && initialAmountPaise >= plan.minPaise && initialAmountPaise <= plan.maxPaise
      ? initialAmountPaise
      : undefined;

  return (
    <div className="grid gap-10">
      {back}
      <header className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="eyebrow">{formatTenure(plan.tenureMonths)} plan</p>
          <h1 className="mt-3 font-display text-[clamp(2.25rem,6vw,3.75rem)] leading-none">{plan.name}</h1>
          {plan.description ? <p className="mt-5 max-w-2xl leading-7 text-parchment/80">{plan.description}</p> : null}
        </div>
        <dl className="grid grid-cols-3 gap-4 border-t border-border pt-5 lg:border-t-0 lg:pt-0">
          <div>
            <dt className="label">Rate</dt>
            <dd className="mt-2 font-display text-3xl text-gold tnum">{formatBps(plan.rateBps)}</dd>
          </div>
          <div>
            <dt className="label">Tenure</dt>
            <dd className="mt-2 font-display text-3xl tnum">{formatTenure(plan.tenureMonths)}</dd>
          </div>
          <div>
            <dt className="label">From</dt>
            <dd className="mt-2 font-display text-3xl tnum">{formatPaise(plan.minPaise)}</dd>
          </div>
        </dl>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_22rem]">
        <ReturnsCalculator plans={[plan]} startDate={startDate} initialAmountPaise={initialAmount} lockPlan />
        <div className="grid content-start gap-6">
          {me.data ? <InvestPanel kycStatus={me.data.customer.kycStatus} slug={plan.slug} /> : null}
          <section aria-labelledby="terms-heading" className="hairline rounded-[2px] p-6 text-sm leading-6 text-parchment/75">
            <h2 id="terms-heading" className="label">
              Key terms
            </h2>
            <ul className="mt-4 grid gap-2">
              <li>Monthly return on the minimum: {formatPaise(monthlyReturnPaise(plan.minPaise, plan.rateBps))}</li>
              <li>Maximum per investment: {formatPaise(plan.maxPaise)}</li>
              <li>Credited returns can be withdrawn at any time after verification.</li>
              <li>Principal is returned at maturity and cannot be withdrawn early.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
