"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import type { AdminStaff } from "@/lib/staff";
import { WithdrawalStatusBadge } from "@/components/withdrawals/WithdrawalStatusBadge";
import { WithdrawalActions } from "@/components/withdrawals/WithdrawalActions";
import { PayoutAttempts } from "@/components/withdrawals/PayoutAttempts";
import { PayoutEvents } from "@/components/withdrawals/PayoutEvents";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime, shortId } from "@/lib/format";
import { can } from "@/lib/permissions";
import { withdrawalQueries } from "@/lib/queries/withdrawals";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-x-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-dust">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function WithdrawalDetail({
  withdrawalId,
  staff,
}: {
  withdrawalId: string;
  staff: AdminStaff;
}) {
  const { data, error } = useQuery(withdrawalQueries.detail(withdrawalId));

  if (!data) return <Notice tone="error">{error?.message ?? "Withdrawal not found"}</Notice>;

  const { withdrawal: w, payouts, events } = data;
  const canWrite = can(staff.role, "withdrawals.write");
  const canOverride = can(staff.role, "withdrawals.override");

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Withdrawal"
        title={shortId(w.id)}
        description={
          <Link href={`/customers/${w.customerId}`} className="text-parchment hover:text-gold">
            {w.customerId.slice(0, 8)}
          </Link>
        }
        actions={
          <>
            <WithdrawalStatusBadge status={w.status} />
            {w.needsReview ? (
              <span className="text-xs font-semibold text-ember">
                {w.reviewReason?.startsWith("HIGH PRIORITY") ? "HIGH PRIORITY review" : "Needs review"}
              </span>
            ) : null}
            <ButtonLink href="/withdrawals" variant="ghost" size="sm">
              Back
            </ButtonLink>
          </>
        }
      />

      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}

      <section aria-labelledby="wd-details-heading">
        <h2 id="wd-details-heading" className="mb-3 text-sm font-semibold text-dust uppercase tracking-wide">
          Details
        </h2>
        <dl className="rounded-[3px] border border-border px-4">
          <Row label="Amount">{formatPaise(w.amountPaise)}</Row>
          <Row label="Account">{w.destination.accountMasked} — {w.destination.holderName} ({w.destination.ifsc})</Row>
          <Row label="Customer">
            <Link href={`/customers/${w.customerId}`} className="font-mono text-xs hover:text-gold">
              {w.customerId}
            </Link>
          </Row>
          <Row label="Status">
            <WithdrawalStatusBadge status={w.status} />
          </Row>
          {w.rejectReason ? <Row label="Reject reason">{w.rejectReason}</Row> : null}
          {w.utr ? <Row label="UTR">{w.utr}</Row> : null}
          {w.batchId ? (
            <Row label="Batch">
              <Link href={`/withdrawals/batches/${w.batchId}`} className="font-mono text-xs hover:text-gold">
                {w.batchId.slice(0, 8)}
              </Link>
            </Row>
          ) : null}
          <Row label="Requested">{formatDateTime(w.requestedAt)}</Row>
          {w.decidedAt ? <Row label="Decided">{formatDateTime(w.decidedAt)}</Row> : null}
          {w.paidAt ? <Row label="Paid">{formatDateTime(w.paidAt)}</Row> : null}
          {w.failedAt ? <Row label="Failed">{formatDateTime(w.failedAt)}</Row> : null}
          {w.reversedAt ? <Row label="Reversed">{formatDateTime(w.reversedAt)}</Row> : null}
          <Row label="Updated">{formatDateTime(w.updatedAt)}</Row>
        </dl>
      </section>

      {(w.needsReview || w.reviewReason) ? (
        <section aria-labelledby="wd-review-heading">
          <h2 id="wd-review-heading" className="mb-3 text-sm font-semibold text-dust uppercase tracking-wide">
            Review flag
          </h2>
          <div className={`rounded-[3px] border px-4 py-3 text-sm ${w.needsReview ? "border-ember/30 bg-ember/5" : "border-border bg-surface"}`}>
            {w.reviewReason ? (
              <p className={`whitespace-pre-wrap font-medium ${w.needsReview ? "text-ember" : "text-parchment"}`}>
                {w.reviewReason}
              </p>
            ) : null}
            {w.reviewResolvedAt ? (
              <p className="mt-2 text-dust">
                Resolved {formatDateTime(w.reviewResolvedAt)}
                {w.reviewNote ? <> — <span className="whitespace-pre-wrap">{w.reviewNote}</span></> : null}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {(canWrite || canOverride) ? (
        <section aria-labelledby="wd-actions-heading">
          <h2 id="wd-actions-heading" className="mb-3 text-sm font-semibold text-dust uppercase tracking-wide">
            Actions
          </h2>
          <WithdrawalActions withdrawal={w} canWrite={canWrite} canOverride={canOverride} />
        </section>
      ) : null}

      <section aria-labelledby="wd-payouts-heading">
        <h2 id="wd-payouts-heading" className="mb-3 text-sm font-semibold text-dust uppercase tracking-wide">
          Payout attempts
        </h2>
        <PayoutAttempts payouts={payouts} />
      </section>

      <section aria-labelledby="wd-events-heading">
        <h2 id="wd-events-heading" className="mb-3 text-sm font-semibold text-dust uppercase tracking-wide">
          Events
        </h2>
        <PayoutEvents events={events} />
      </section>
    </div>
  );
}
