"use client";

import { useRouter } from "next/navigation";
import type { Plan, PlanStatus } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/lib/plans/cache";
import { useChangePlanStatus, useDeletePlan } from "@/lib/plans/mutations";

export function PlanStatusActions({ plan, afterDelete }: { plan: Plan; afterDelete?: string }) {
  const router = useRouter();
  const changeStatus = useChangePlanStatus(plan.id);
  const remove = useDeletePlan(plan.id);
  const busy = changeStatus.isPending || remove.isPending;
  const message = errorMessage(changeStatus.error) ?? errorMessage(remove.error);

  function setStatus(status: Exclude<PlanStatus, "draft">, prompt: string) {
    if (!window.confirm(prompt)) return;
    remove.reset();
    changeStatus.mutate(status);
  }

  function deleteDraft() {
    if (!window.confirm(`Delete the draft "${plan.name}"? This cannot be undone.`)) return;
    changeStatus.reset();
    remove.mutate(undefined, {
      onSuccess: () => {
        if (afterDelete) router.replace(afterDelete);
      },
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {plan.status !== "active" ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => setStatus("active", `Make "${plan.name}" visible to customers?`)}
          >
            {changeStatus.isPending && changeStatus.variables === "active" ? "Activating…" : "Activate"}
          </Button>
        ) : null}
        {plan.status === "active" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              setStatus("archived", `Archive "${plan.name}"? Customers will no longer be able to invest in it.`)
            }
          >
            {changeStatus.isPending ? "Archiving…" : "Archive"}
          </Button>
        ) : null}
        {plan.status === "draft" ? (
          <Button size="sm" variant="danger" disabled={busy} onClick={deleteDraft}>
            {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        ) : null}
      </div>
      {message ? (
        <span role="alert" className="max-w-64 text-right text-xs text-ember">
          {message}
        </span>
      ) : null}
    </div>
  );
}
