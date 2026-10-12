"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import type { AdminWithdrawal, WithdrawalStatus } from "@nextera/contracts";
import { WithdrawalStatusBadge } from "@/components/withdrawals/WithdrawalStatusBadge";
import { BulkRejectDialog } from "@/components/withdrawals/BulkRejectDialog";
import { BulkResultNotice } from "@/components/withdrawals/BulkResultNotice";
import { EmptyState } from "@/components/desk/EmptyState";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Notice } from "@/components/ui/Notice";
import { formatDateTime, shortId } from "@/lib/format";
import type { WithdrawalListFilters } from "@/lib/withdrawals/filters";
import { withdrawalQueries } from "@/lib/queries/withdrawals";
import { invalidateWithdrawals } from "@/lib/withdrawals/cache";
import { runAction } from "@/lib/actions/navigation";
import { unwrapOutcome } from "@/lib/actions/outcome";
import { bulkApproveWithdrawals, bulkRejectWithdrawals } from "@/app/(console)/withdrawals/actions";
import { createPayoutBatch } from "@/app/(console)/withdrawals/batches/actions";
import type { WithdrawalBulkResponse } from "@nextera/contracts";

const APPROVED: WithdrawalStatus = "approved";

export function WithdrawalsTable({
  filters,
  filtered,
}: {
  filters: WithdrawalListFilters;
  filtered: boolean;
}) {
  const queryClient = useQueryClient();
  const { data, error, isPending, isFetching, hasNextPage, fetchNextPage } = useInfiniteQuery(
    withdrawalQueries.list(filters),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [lastBulkResult, setLastBulkResult] = useState<WithdrawalBulkResponse | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const withdrawals = data?.pages.flatMap((p) => p.withdrawals) ?? [];
  const visibleIds = new Set(withdrawals.map((w) => w.id));
  const checkedIds = [...selectedIds].filter((id) => visibleIds.has(id));
  const checkedWithdrawals = checkedIds.map((id) => withdrawals.find((w) => w.id === id)).filter(Boolean) as AdminWithdrawal[];
  const allApproved = checkedIds.length > 0 && checkedWithdrawals.every((w) => w.status === APPROVED);
  const checkedTotalPaise = checkedWithdrawals.reduce((sum, w) => sum + w.amountPaise, 0);

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(withdrawals.map((w) => w.id)) : new Set());
  }

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) { next.add(id); } else { next.delete(id); }
      return next;
    });
  }

  const bulkApproveMutation = useMutation({
    mutationFn: async () => unwrapOutcome(await runAction(() => bulkApproveWithdrawals(checkedIds))),
    onSuccess: async (result) => {
      setLastBulkResult(result);
      setSelectedIds(new Set());
      await invalidateWithdrawals(queryClient);
    },
    onError: (err: Error) => setBulkError(err.message),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (reason: string) => unwrapOutcome(await runAction(() => bulkRejectWithdrawals(checkedIds, reason))),
    onSuccess: async (result) => {
      setLastBulkResult(result);
      setSelectedIds(new Set());
      setRejectOpen(false);
      await invalidateWithdrawals(queryClient);
    },
    onError: (err: Error) => setBulkError(err.message),
  });

  const createBatchMutation = useMutation({
    mutationFn: async () => unwrapOutcome(await runAction(() => createPayoutBatch(checkedIds))),
    onSuccess: async (result) => {
      if (result.batch) setLastBulkResult(result);
      setSelectedIds(new Set());
      await invalidateWithdrawals(queryClient);
    },
    onError: (err: Error) => setBulkError(err.message),
  });

  const mutating = bulkApproveMutation.isPending || bulkRejectMutation.isPending || createBatchMutation.isPending;

  if (isPending) return <p className="text-sm text-dust">Loading withdrawals…</p>;
  if (error && !data) return <Notice tone="error">{error.message}</Notice>;
  if (withdrawals.length === 0) {
    return <EmptyState>{filtered ? "No withdrawals match these filters." : "No withdrawals yet."}</EmptyState>;
  }

  return (
    <div className="grid gap-3">
      {lastBulkResult ? (
        <BulkResultNotice result={lastBulkResult} onDismiss={() => setLastBulkResult(null)} />
      ) : null}
      {bulkError ? (
        <div aria-live="polite">
          <Notice tone="error">{bulkError}</Notice>
        </div>
      ) : null}

      {checkedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[3px] border border-border px-3 py-2" role="toolbar" aria-label="Bulk actions">
          <span className="text-sm text-dust">{checkedIds.length} selected</span>
          <Button
            size="sm"
            variant="primary"
            onClick={() => { setBulkError(null); setApproveOpen(true); }}
            disabled={mutating}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => { setBulkError(null); setRejectOpen(true); }}
            disabled={mutating}
          >
            Reject
          </Button>
          {allApproved ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setBulkError(null); setBatchOpen(true); }}
              disabled={mutating}
            >
              Create payout batch
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} disabled={mutating}>
            Clear
          </Button>
        </div>
      ) : null}

      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <caption className="sr-only">Withdrawals, newest first</caption>
          <thead>
            <tr>
              <th scope="col">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={withdrawals.length > 0 && checkedIds.length === withdrawals.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th scope="col">ID</th>
              <th scope="col">Customer</th>
              <th scope="col" className="num">Amount</th>
              <th scope="col">Account</th>
              <th scope="col">Status</th>
              <th scope="col">Requested</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => (
              <WithdrawalRow
                key={w.id}
                withdrawal={w}
                checked={selectedIds.has(w.id)}
                onToggle={(checked) => toggleRow(w.id, checked)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {hasNextPage ? (
        <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} disabled={isFetching}>
          Load more
        </Button>
      ) : null}

      <BulkRejectDialog
        open={rejectOpen}
        pending={bulkRejectMutation.isPending}
        count={checkedIds.length}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => bulkRejectMutation.mutate(reason)}
      />

      <ConfirmDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title={`Approve ${checkedIds.length} withdrawal${checkedIds.length === 1 ? "" : "s"}`}
        description={`Total: ${formatPaise(checkedTotalPaise)}`}
        confirmLabel="Approve all"
        pendingLabel="Approving…"
        pending={bulkApproveMutation.isPending}
        onConfirm={() => { setApproveOpen(false); bulkApproveMutation.mutate(); }}
      />

      <ConfirmDialog
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        title={`Create payout batch — ${checkedIds.length} withdrawal${checkedIds.length === 1 ? "" : "s"}`}
        description={`Total: ${formatPaise(checkedTotalPaise)}. This will submit transfers to Cashfree and cannot be recalled.`}
        confirmLabel="Create batch"
        pendingLabel="Creating…"
        pending={createBatchMutation.isPending}
        onConfirm={() => { setBatchOpen(false); createBatchMutation.mutate(); }}
      />
    </div>
  );
}

function WithdrawalRow({
  withdrawal: w,
  checked,
  onToggle,
}: {
  withdrawal: AdminWithdrawal;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <tr>
      <td>
        <input
          type="checkbox"
          aria-label={`Select withdrawal ${shortId(w.id)}`}
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
        />
      </td>
      <td>
        <Link href={`/withdrawals/${w.id}`} className="font-mono text-xs hover:text-gold">
          {shortId(w.id)}
        </Link>
      </td>
      <td>
        <Link href={`/customers/${w.customerId}`} className="font-mono text-xs hover:text-gold">
          {shortId(w.customerId)}
        </Link>
      </td>
      <td className="num">{formatPaise(w.amountPaise)}</td>
      <td className="font-mono text-xs">{w.destination.accountMasked}</td>
      <td>
        <div className="flex items-center gap-1.5">
          <WithdrawalStatusBadge status={w.status} />
          {w.needsReview ? <span className="text-xs text-ember">⚑</span> : null}
        </div>
      </td>
      <td className="text-xs text-dust">{formatDateTime(w.requestedAt)}</td>
    </tr>
  );
}
