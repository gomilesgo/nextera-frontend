"use client";

import { useQuery } from "@tanstack/react-query";
import { ReturnsCalculator } from "@/components/calculator/ReturnsCalculator";
import { PlanCard } from "@/components/plans/PlanCard";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { plansQuery } from "@/lib/queries/options";

export function PlansView({ startDate }: { startDate: string }) {
  const plans = useQuery(plansQuery());

  return (
    <div className="grid gap-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Plans</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">Open plans</h1>
          <p className="mt-3 max-w-2xl text-parchment/75">
            Fixed annual rates, paid monthly as simple interest. Your principal is returned at maturity.
          </p>
        </div>
      </header>

      {plans.isPending ? (
        <p className="text-dust" role="status">
          Loading plans…
        </p>
      ) : plans.isError ? (
        <Notice tone="error" title="We could not load plans">
          <span className="block">{plans.error.message}</span>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => plans.refetch()} disabled={plans.isFetching}>
            {plans.isFetching ? "Retrying…" : "Try again"}
          </Button>
        </Notice>
      ) : plans.data.plans.length === 0 ? (
        <Notice tone="info" title="No plans are open right now">
          New plans open regularly. Check back here for the next one.
        </Notice>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.data.plans.map((plan) => (
              <li key={plan.id}>
                <PlanCard plan={plan} href={`/portal/plans/${plan.slug}`} cta="View plan" />
              </li>
            ))}
          </ul>
          <section aria-labelledby="calculator-heading" className="grid gap-6">
            <div>
              <h2 id="calculator-heading" className="font-display text-2xl sm:text-3xl">
                Compare returns
              </h2>
              <p className="mt-2 text-sm text-dust">
                Projection assumes the investment starts today. Figures are before any tax deducted at source.
              </p>
            </div>
            <ReturnsCalculator plans={plans.data.plans} startDate={startDate} />
          </section>
        </>
      )}
    </div>
  );
}
