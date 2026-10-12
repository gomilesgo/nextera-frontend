"use client";

import Link from "next/link";
import { formatBps, formatPaise } from "@nextera/contracts";
import { PlanStatusActions } from "@/components/plans/PlanStatusActions";
import { PlanStatusBadge } from "@/components/plans/PlanStatusBadge";
import { Notice } from "@/components/ui/Notice";
import { usePlans } from "@/lib/queries/hooks";

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

export function PlansTable({ canWrite }: { canWrite: boolean }) {
  const { data, error, isPending, isFetching } = usePlans();

  if (isPending) return <p className="text-sm text-dust">Loading plans…</p>;
  if (error && !data) return <Notice tone="error">{error.message}</Notice>;

  const plans = data?.plans ?? [];

  if (plans.length === 0) {
    return (
      <div className="hairline rounded-[3px] px-4 py-10 text-center text-sm text-dust">
        No plans yet.
        {canWrite ? (
          <>
            {" "}
            <Link href="/plans/new" className="text-gold underline">
              Create the first plan
            </Link>
            .
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Status</th>
              <th className="num">Rate p.a.</th>
              <th className="num">Tenure</th>
              <th className="num">Minimum</th>
              <th className="num">Maximum</th>
              <th>Updated</th>
              {canWrite ? <th className="num">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td>
                  <Link href={`/plans/${plan.id}`} className="font-medium hover:text-gold">
                    {plan.name}
                  </Link>
                  <div className="font-mono text-xs text-dust">{plan.slug}</div>
                </td>
                <td>
                  <PlanStatusBadge status={plan.status} />
                </td>
                <td className="num">{formatBps(plan.rateBps)}</td>
                <td className="num">{plan.tenureMonths} mo</td>
                <td className="num">{formatPaise(plan.minPaise)}</td>
                <td className="num">{formatPaise(plan.maxPaise)}</td>
                <td className="whitespace-nowrap text-dust">{dateFormat.format(new Date(plan.updatedAt))}</td>
                {canWrite ? (
                  <td className="text-right">
                    <PlanStatusActions plan={plan} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}
    </div>
  );
}
