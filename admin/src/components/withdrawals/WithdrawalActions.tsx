"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import type { AdminWithdrawal } from "@nextera/contracts";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Field, TextArea } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Dialog";
import { runAction } from "@/lib/actions/navigation";
import { ActionError, unwrapOutcome } from "@/lib/actions/outcome";
import { withdrawalKeys } from "@/lib/queries/withdrawals";
import { invalidateWithdrawal } from "@/lib/withdrawals/cache";
import { approveWithdrawal, rejectWithdrawal, resolveWithdrawalReview } from "@/app/(console)/withdrawals/actions";
import { payWithdrawal, retryWithdrawal, markWithdrawalFailed } from "@/app/(console)/withdrawals/[id]/actions";

type Action = "approve" | "reject" | "pay" | "retry" | "mark-failed" | "resolve-review" | null;

export function WithdrawalActions({
  withdrawal,
  canWrite,
  canOverride,
}: {
  withdrawal: AdminWithdrawal;
  canWrite: boolean;
  canOverride: boolean;
}) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<Action>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function close() {
    setActive(null);
    setActionError(null);
  }

  function onSuccess(updated: AdminWithdrawal) {
    queryClient.setQueryData(withdrawalKeys.detail(updated.id), (prev: { withdrawal: AdminWithdrawal; payouts: unknown[]; events: unknown[] } | undefined) =>
      prev ? { ...prev, withdrawal: updated } : prev,
    );
    invalidateWithdrawal(queryClient, updated.id, updated.customerId);
    close();
  }

  function onError(e: Error) {
    setActionError(e.message);
    if (e instanceof ActionError && e.code === "payout_settled") {
      invalidateWithdrawal(queryClient, withdrawal.id, withdrawal.customerId);
    }
  }

  const approveMutation = useMutation({
    mutationFn: async () => unwrapOutcome(await runAction(() => approveWithdrawal(withdrawal.id))),
    onSuccess,
    onError,
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => unwrapOutcome(await runAction(() => rejectWithdrawal(withdrawal.id, reason))),
    onSuccess,
    onError,
  });

  const payMutation = useMutation({
    mutationFn: async ({ override, reason }: { override: boolean; reason?: string }) =>
      unwrapOutcome(await runAction(() => payWithdrawal(withdrawal.id, override, reason))),
    onSuccess,
    onError,
  });

  const retryMutation = useMutation({
    mutationFn: async ({ override, reason }: { override: boolean; reason?: string }) =>
      unwrapOutcome(await runAction(() => retryWithdrawal(withdrawal.id, override, reason))),
    onSuccess,
    onError,
  });

  const markFailedMutation = useMutation({
    mutationFn: async (reason: string) => unwrapOutcome(await runAction(() => markWithdrawalFailed(withdrawal.id, reason))),
    onSuccess,
    onError,
  });

  const resolveMutation = useMutation({
    mutationFn: async (note: string) => unwrapOutcome(await runAction(() => resolveWithdrawalReview(withdrawal.id, note))),
    onSuccess,
    onError,
  });

  const w = withdrawal;
  const mutating = approveMutation.isPending || rejectMutation.isPending || payMutation.isPending || retryMutation.isPending || markFailedMutation.isPending || resolveMutation.isPending;
  const amountLabel = formatPaise(w.amountPaise);
  const destLabel = `${w.destination.accountMasked} (${w.destination.ifsc})`;

  return (
    <div className="flex flex-wrap gap-2">
      {canWrite && w.status === "requested" ? (
        <>
          <Button variant="primary" size="sm" onClick={() => { setActionError(null); setActive("approve"); }} disabled={mutating}>
            Approve
          </Button>
          <Button variant="danger" size="sm" onClick={() => { setActionError(null); setActive("reject"); }} disabled={mutating}>
            Reject
          </Button>
        </>
      ) : null}
      {canWrite && w.status === "approved" ? (
        <>
          <Button variant="primary" size="sm" onClick={() => { setActionError(null); setActive("pay"); }} disabled={mutating}>
            Pay
          </Button>
          <Button variant="danger" size="sm" onClick={() => { setActionError(null); setActive("reject"); }} disabled={mutating}>
            Reject
          </Button>
        </>
      ) : null}
      {canWrite && (w.status === "failed" || w.status === "reversed") ? (
        <Button variant="primary" size="sm" onClick={() => { setActionError(null); setActive("retry"); }} disabled={mutating}>
          Retry
        </Button>
      ) : null}
      {canOverride && w.unconfirmed ? (
        <Button variant="danger" size="sm" onClick={() => { setActionError(null); setActive("mark-failed"); }} disabled={mutating}>
          Mark failed
        </Button>
      ) : null}
      {canWrite && w.needsReview && !w.reviewResolvedAt ? (
        <Button variant="ghost" size="sm" onClick={() => { setActionError(null); setActive("resolve-review"); }} disabled={mutating}>
          Resolve review
        </Button>
      ) : null}

      {actionError ? (
        <div aria-live="polite" className="w-full">
          <Notice tone="error">{actionError}</Notice>
        </div>
      ) : null}

      <ConfirmDialog
        open={active === "approve"}
        onClose={close}
        title="Approve withdrawal"
        description={`${amountLabel} to ${destLabel} for customer ${w.customerId.slice(0, 8)}`}
        confirmLabel="Approve"
        pendingLabel="Approving…"
        pending={approveMutation.isPending}
        onConfirm={() => approveMutation.mutate()}
      />

      <ConfirmDialog
        open={active === "reject"}
        onClose={close}
        title="Reject withdrawal"
        description={`${amountLabel} for customer ${w.customerId.slice(0, 8)}`}
        confirmLabel="Reject"
        pendingLabel="Rejecting…"
        tone="danger"
        pending={rejectMutation.isPending}
        reason={{ label: "Reason (shown to customer)", hint: "At least 5 characters" }}
        onConfirm={(reason) => rejectMutation.mutate(reason)}
      />

      <PayDialog
        open={active === "pay"}
        pending={payMutation.isPending}
        canOverride={canOverride}
        label={amountLabel}
        dest={destLabel}
        onClose={close}
        onConfirm={(override, reason) => payMutation.mutate({ override, reason })}
        title="Pay withdrawal"
        confirmLabel="Initiate payout"
        pendingLabel="Initiating…"
      />

      <PayDialog
        open={active === "retry"}
        pending={retryMutation.isPending}
        canOverride={canOverride}
        label={amountLabel}
        dest={destLabel}
        onClose={close}
        onConfirm={(override, reason) => retryMutation.mutate({ override, reason })}
        title="Retry withdrawal"
        confirmLabel="Retry payout"
        pendingLabel="Retrying…"
      />

      <MarkFailedDialog
        open={active === "mark-failed"}
        pending={markFailedMutation.isPending}
        label={amountLabel}
        onClose={close}
        onConfirm={(reason) => markFailedMutation.mutate(reason)}
      />

      <ResolveReviewDialog
        open={active === "resolve-review"}
        pending={resolveMutation.isPending}
        onClose={close}
        onConfirm={(note) => resolveMutation.mutate(note)}
      />
    </div>
  );
}

function PayDialog({
  open, pending, canOverride, label, dest, onClose, onConfirm, title, confirmLabel, pendingLabel,
}: {
  open: boolean;
  pending: boolean;
  canOverride: boolean;
  label: string;
  dest: string;
  onClose: () => void;
  onConfirm: (override: boolean, reason?: string) => void;
  title: string;
  confirmLabel: string;
  pendingLabel: string;
}) {
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm(override, override ? overrideReason : undefined);
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} description={`${label} to ${dest}`} dismissible={!pending}>
      <form onSubmit={submit} className="grid gap-4">
        <p className="text-sm text-dust">This will initiate a Cashfree payout. The action cannot be undone.</p>
        {canOverride ? (
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
              Override blocked customer
            </label>
            {override ? (
              <Field name="override-reason" label="Override reason (10+ characters)">
                <TextArea
                  name="override-reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={2}
                  required
                  minLength={10}
                />
              </Field>
            ) : null}
          </div>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function MarkFailedDialog({
  open, pending, label, onClose, onConfirm,
}: {
  open: boolean;
  pending: boolean;
  label: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 10) { setErr("Explain in at least 10 characters"); return; }
    setErr(null);
    onConfirm(trimmed);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Mark payout failed"
      description={`${label} — CAUTION: this releases the hold and returns money to the customer wallet.`}
      dismissible={!pending}
    >
      <form onSubmit={submit} className="grid gap-4">
        <Notice tone="error">
          This action returns the funds to the customer&apos;s wallet. Only use it after confirming with Cashfree that the transfer was never processed.
        </Notice>
        <Field name="mark-failed-reason" label="Confirmation reason (10+ characters)" error={err ? [err] : undefined}>
          <TextArea
            name="mark-failed-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            minLength={10}
            invalid={Boolean(err)}
          />
        </Field>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={pending} aria-busy={pending}>
            {pending ? "Marking failed…" : "Mark failed"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ResolveReviewDialog({
  open, pending, onClose, onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Resolve review flag"
      confirmLabel="Resolve"
      pendingLabel="Resolving…"
      pending={pending}
      reason={{ label: "Note (5+ characters)", hint: "Describe how the issue was resolved" }}
      onConfirm={onConfirm}
    />
  );
}
