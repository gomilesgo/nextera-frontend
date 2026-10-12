"use client";

import { useQuery } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import { Notice } from "@/components/ui/Notice";
import { payablesQueries } from "@/lib/queries/payables";

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="hairline rounded-[3px] bg-horizon/60 p-4">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 font-mono text-sm">{value}</dd>
      {sub ? <dd className="mt-0.5 font-mono text-xs text-dust">{sub}</dd> : null}
    </div>
  );
}

export function PayablesSummaryCards() {
  const { data, error, isPending } = useQuery(payablesQueries.summary());

  if (isPending) return <p className="text-sm text-dust">Loading summary…</p>;
  if (error || !data) return <Notice tone="error">{error?.message ?? "Could not load payables summary."}</Notice>;

  const { summary } = data;

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <SummaryCard label="Total wallet balance" value={formatPaise(summary.totalWalletPaise)} />
      <SummaryCard
        label="Pending withdrawals"
        value={formatPaise(summary.pendingWithdrawals.totalPaise)}
        sub={[
          summary.pendingWithdrawals.requestedPaise ? `Req ${formatPaise(summary.pendingWithdrawals.requestedPaise)}` : null,
          summary.pendingWithdrawals.approvedPaise ? `Appr ${formatPaise(summary.pendingWithdrawals.approvedPaise)}` : null,
          summary.pendingWithdrawals.processingPaise ? `Proc ${formatPaise(summary.pendingWithdrawals.processingPaise)}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "None pending"}
      />
      <SummaryCard
        label="Returns due (30 days)"
        value={formatPaise(summary.returnsDue30.grossPaise)}
        sub={`Net of TDS: ${formatPaise(summary.returnsDue30.netPaise)}`}
      />
      <SummaryCard
        label="Principal maturing (30 days)"
        value={formatPaise(summary.principalMaturing30Paise)}
      />
      <SummaryCard
        label="Principal maturing (90 days)"
        value={formatPaise(summary.principalMaturing90Paise)}
      />
    </dl>
  );
}
