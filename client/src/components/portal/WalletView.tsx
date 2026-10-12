"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Withdrawal } from "@nextera/contracts";
import { openWithdrawalStatuses } from "@nextera/contracts";
import { formatPaise, paiseToRupees } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { mutationMessage } from "@/lib/actionResult";
import { formatTimestamp } from "@/lib/dates";
import { useCancelWithdrawal, useRequestWithdrawal } from "@/lib/queries/mutations";
import { bankAccountsQuery, walletQuery, withdrawalsQuery } from "@/lib/queries/options";
import type { WithdrawalStatus } from "@nextera/contracts";

const statusBadge: Record<WithdrawalStatus, { label: string; tone: BadgeTone }> = {
  requested: { label: "Requested", tone: "info" },
  approved: { label: "Approved", tone: "info" },
  processing: { label: "Processing", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
  reversed: { label: "Reversed", tone: "warning" },
};

function canCancel(status: WithdrawalStatus): boolean {
  return (openWithdrawalStatuses as readonly string[]).includes(status);
}

function WithdrawalRow({
  withdrawal,
  onCancel,
  cancelling,
}: {
  withdrawal: Withdrawal;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const badge = statusBadge[withdrawal.status];
  const requestedAt = formatTimestamp(withdrawal.requestedAt);

  return (
    <li className="hairline grid gap-4 rounded-[2px] bg-horizon/60 p-4 sm:flex sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0 grid gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-base text-parchment tnum">{formatPaise(withdrawal.amountPaise)}</span>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
        <p className="text-xs text-dust">
          To {withdrawal.destination.accountMasked} · {requestedAt ?? "—"}
        </p>
        {withdrawal.rejectReason ? (
          <p className="text-xs text-ember">Reason: {withdrawal.rejectReason}</p>
        ) : null}
      </div>
      {canCancel(withdrawal.status) ? (
        confirm ? (
          <div className="flex shrink-0 gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => { onCancel(withdrawal.id); setConfirm(false); }}
              disabled={cancelling}
              aria-busy={cancelling}
            >
              {cancelling ? "Cancelling…" : "Confirm cancel"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
              Keep
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} className="shrink-0">
            Cancel
          </Button>
        )
      ) : null}
    </li>
  );
}

function WithdrawForm({ withdrawablePaise, minWithdrawalPaise, primaryAccountMasked }: {
  withdrawablePaise: number;
  minWithdrawalPaise: number;
  primaryAccountMasked: string;
}) {
  const [amountStr, setAmountStr] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [confirm, setConfirm] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const withdraw = useRequestWithdrawal();

  const amountRupees = parseFloat(amountStr);
  const amountPaise = Number.isFinite(amountRupees) ? Math.round(amountRupees * 100) : 0;

  function validateAmount(): string | null {
    if (!amountStr.trim()) return "Enter an amount.";
    if (!Number.isFinite(amountRupees) || amountRupees <= 0) return "Enter a valid amount.";
    if (amountPaise < minWithdrawalPaise)
      return `Minimum withdrawal is ${formatPaise(minWithdrawalPaise)}.`;
    if (amountPaise > withdrawablePaise)
      return `You can withdraw up to ${formatPaise(withdrawablePaise)}.`;
    return null;
  }

  function handleConfirm() {
    const error = validateAmount();
    if (error) { setFieldError(error); return; }
    setFieldError(null);
    setConfirm(true);
  }

  function handleSubmit() {
    withdraw.mutate(
      { amountPaise, idempotencyKey },
      {
        onSuccess: () => {
          setAmountStr("");
          setConfirm(false);
          setIdempotencyKey(crypto.randomUUID());
        },
        onError: () => {
          setConfirm(false);
        },
      },
    );
  }

  const mutError = mutationMessage(withdraw.error);

  if (confirm) {
    return (
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-parchment/80">
          Withdraw <span className="font-medium text-parchment">{formatPaise(amountPaise)}</span> to{" "}
          <span className="font-mono">{primaryAccountMasked}</span>? Staff will approve and transfer it to your bank.
        </p>
        {mutError ? <Notice tone="error">{mutError}</Notice> : null}
        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={withdraw.isPending} aria-busy={withdraw.isPending}>
            {withdraw.isPending ? "Submitting…" : "Confirm withdrawal"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirm(false)} disabled={withdraw.isPending}>
            Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Field name="amount" label="Amount (₹)" error={fieldError ?? undefined}>
        <TextInput
          name="amount"
          type="number"
          min={paiseToRupees(minWithdrawalPaise)}
          max={paiseToRupees(withdrawablePaise)}
          step="0.01"
          inputMode="decimal"
          placeholder={`Min ${formatPaise(minWithdrawalPaise)}`}
          value={amountStr}
          onChange={(e) => { setAmountStr(e.target.value); setFieldError(null); }}
          invalid={fieldError !== undefined && fieldError !== null}
          autoComplete="off"
        />
      </Field>
      <p className="text-xs leading-5 text-dust">
        Paid to <span className="font-mono">{primaryAccountMasked}</span>. Subject to staff approval.
      </p>
      <Button onClick={handleConfirm}>Request withdrawal</Button>
    </div>
  );
}

export function WalletView() {
  const wallet = useQuery(walletQuery());
  const withdrawals = useQuery(withdrawalsQuery());
  const bank = useQuery(bankAccountsQuery());
  const cancel = useCancelWithdrawal();

  const w = wallet.data;
  const primaryAccount = bank.data?.accounts.find((a) => a.isPrimary && a.status === "verified") ?? null;
  const cancelError = mutationMessage(cancel.error);

  return (
    <div className="grid gap-10">
      <header>
        <p className="eyebrow">Wallet</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">Your wallet</h1>
        <p className="mt-3 max-w-2xl text-parchment/75">
          Monthly returns are credited here. Withdraw to your verified bank account any time.
        </p>
      </header>

      {wallet.isError ? (
        <Notice tone="error" title="Could not load wallet">
          {wallet.error.message}
        </Notice>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Balance", value: w?.walletBalancePaise },
            { label: "On hold", value: w?.withdrawalHoldPaise },
            { label: "Withdrawable", value: w?.withdrawablePaise },
          ].map(({ label, value }) => (
            <div key={label} className="hairline rounded-[2px] bg-horizon/60 p-5">
              <p className="label">{label}</p>
              <p className="mt-2 font-display text-3xl text-gold tnum">
                {value !== undefined ? formatPaise(value) : "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="withdrawals-heading" className="grid gap-4">
          <h2 id="withdrawals-heading" className="label">Withdrawals</h2>
          {cancelError ? <Notice tone="error">{cancelError}</Notice> : null}
          {withdrawals.isPending ? (
            <p className="text-dust" role="status">Loading withdrawals…</p>
          ) : withdrawals.isError ? (
            <Notice tone="error" title="Could not load withdrawals">{withdrawals.error.message}</Notice>
          ) : withdrawals.data.withdrawals.length === 0 ? (
            <p className="text-sm text-parchment/70">No withdrawals yet.</p>
          ) : (
            <ul className="grid gap-3">
              {withdrawals.data.withdrawals.map((wd) => (
                <WithdrawalRow
                  key={wd.id}
                  withdrawal={wd}
                  onCancel={(id) => cancel.mutate(id)}
                  cancelling={cancel.isPending && cancel.variables === wd.id}
                />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="withdraw-heading" className="hairline rounded-[2px] bg-horizon/60 p-6 sm:p-8">
          <h2 id="withdraw-heading" className="label">Withdraw funds</h2>
          <div className="mt-5">
            {!primaryAccount ? (
              <Notice tone="info" title="No verified bank account">
                <span className="block">Add and verify a bank account to withdraw.</span>
                <ButtonLink href="/portal/bank" size="sm" className="mt-3">Go to Bank accounts</ButtonLink>
              </Notice>
            ) : wallet.data ? (
              wallet.data.withdrawablePaise < wallet.data.minWithdrawalPaise ? (
                <Notice tone="info" title="Not enough to withdraw">
                  Your withdrawable balance is {formatPaise(wallet.data.withdrawablePaise)}.
                  The minimum withdrawal is {formatPaise(wallet.data.minWithdrawalPaise)}.
                </Notice>
              ) : (
                <WithdrawForm
                  withdrawablePaise={wallet.data.withdrawablePaise}
                  minWithdrawalPaise={wallet.data.minWithdrawalPaise}
                  primaryAccountMasked={primaryAccount.accountMasked}
                />
              )
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
