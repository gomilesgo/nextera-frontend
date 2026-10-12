"use client";

import Form from "next/form";
import { useRouter } from "next/navigation";
import { withdrawalStatuses } from "@nextera/contracts";
import type { WithdrawalStatus } from "@nextera/contracts";
import type { WithdrawalListFilters } from "@/lib/withdrawals/filters";
import { Button } from "@/components/ui/Button";

const statusLabels: Record<WithdrawalStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  processing: "Processing",
  paid: "Paid",
  rejected: "Rejected",
  cancelled: "Cancelled",
  failed: "Failed",
  reversed: "Reversed",
};

export function WithdrawalFilterForm({ filters }: { filters: WithdrawalListFilters }) {
  const router = useRouter();
  return (
    <Form action="/withdrawals" className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1">
        <label htmlFor="wd-status" className="text-xs text-dust">
          Status
        </label>
        <select
          id="wd-status"
          name="status"
          defaultValue={filters.status ?? ""}
          className="rounded-[3px] border border-border bg-horizon px-2 py-1.5 text-sm text-parchment"
        >
          <option value="">All statuses</option>
          {withdrawalStatuses.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <label htmlFor="wd-needs-review" className="text-xs text-dust">
          Review flag
        </label>
        <select
          id="wd-needs-review"
          name="needsReview"
          defaultValue={filters.needsReview === true ? "true" : filters.needsReview === false ? "false" : ""}
          className="rounded-[3px] border border-border bg-horizon px-2 py-1.5 text-sm text-parchment"
        >
          <option value="">Any</option>
          <option value="true">Needs review</option>
          <option value="false">No flag</option>
        </select>
      </div>
      {filters.customerId ? (
        <input type="hidden" name="customerId" value={filters.customerId} />
      ) : null}
      <Button type="submit" variant="ghost" size="sm">
        Filter
      </Button>
      <Button type="reset" variant="ghost" size="sm" onClick={() => router.push("/withdrawals")}>
        Clear
      </Button>
    </Form>
  );
}
