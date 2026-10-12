"use client";

import { formatBps, formatPaise } from "@nextera/contracts";
import { PlanForm } from "@/components/plans/PlanForm";
import { PlanStatusActions } from "@/components/plans/PlanStatusActions";
import { PlanStatusBadge } from "@/components/plans/PlanStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePlan } from "@/lib/queries/hooks";

export function PlanDetail({
  planId,
  canWrite,
  savedMessage,
}: {
  planId: string;
  canWrite: boolean;
  savedMessage?: string;
}) {
  const { data, error, isPending } = usePlan(planId);

  if (isPending) return <p className="text-sm text-dust">Loading plan…</p>;
  if (!data) return <Notice tone="error">{error?.message ?? "Plan not found"}</Notice>;

  const { plan } = data;

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Plans"
        title={plan.name}
        description={<span className="font-mono">{plan.slug}</span>}
        actions={
          <>
            <PlanStatusBadge status={plan.status} />
            {canWrite ? <PlanStatusActions plan={plan} afterDelete="/plans?saved=deleted" /> : null}
            <ButtonLink href="/plans" variant="ghost" size="sm">
              All plans
            </ButtonLink>
          </>
        }
      />

      {savedMessage ? <Notice tone="success">{savedMessage}</Notice> : null}

      {canWrite ? (
        <div className="hairline max-w-3xl rounded-[3px] bg-horizon/40 p-5">
          <PlanForm key={plan.updatedAt} plan={plan} />
        </div>
      ) : (
        <dl className="hairline grid max-w-3xl gap-x-6 gap-y-4 rounded-[3px] bg-horizon/40 p-5 sm:grid-cols-4">
          <div>
            <dt className="eyebrow">Rate p.a.</dt>
            <dd className="mt-1">{formatBps(plan.rateBps)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Tenure</dt>
            <dd className="mt-1">{plan.tenureMonths} months</dd>
          </div>
          <div>
            <dt className="eyebrow">Minimum</dt>
            <dd className="mt-1">{formatPaise(plan.minPaise)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Maximum</dt>
            <dd className="mt-1">{formatPaise(plan.maxPaise)}</dd>
          </div>
          <div className="sm:col-span-4">
            <dt className="eyebrow">Description</dt>
            <dd className="mt-1 whitespace-pre-line text-dust">{plan.description || "No description."}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
