"use client";

import { useReducer, useState } from "react";
import type { FormEvent } from "react";
import { MANUAL_ADJUSTMENT_REASON_MIN_LENGTH, formatPaise } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import {
  MAX_ADJUSTMENT_LABEL,
  advanceAdjustment,
  backToEdit,
  buildAdjustment,
  readAdjustmentForm,
  resultingBalance,
  startAdjustment,
} from "@/lib/customers/adjustment";
import type { AdjustmentFormValues } from "@/lib/customers/adjustment";
import { actionError } from "@/lib/customers/cache";
import { ADJUSTMENT_MAY_HAVE_POSTED, adjustmentOutcomeUnknown } from "@/lib/customers/messages";
import { useManualAdjustment } from "@/lib/customers/mutations";
import type { FieldErrors } from "@/lib/actions/outcome";
import { cx } from "@/lib/cx";

export function ManualAdjustmentButton({
  customerId,
  customerName,
  walletPaise,
}: {
  customerId: string;
  customerName: string;
  walletPaise: number;
}) {
  const [open, setOpen] = useState(false);
  const adjust = useManualAdjustment(customerId);

  function close() {
    adjust.reset();
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Adjust wallet
      </Button>
      <Dialog
        open={open}
        onClose={close}
        dismissible={!adjust.isPending}
        closeButton
        backdropClose
        title="Manual wallet adjustment"
        description={`Credit or debit ${customerName}'s wallet. The reason is stored as the ledger memo and in the audit log.`}
      >
        <AdjustmentFlow adjust={adjust} walletPaise={walletPaise} onDone={close} />
      </Dialog>
    </>
  );
}

function AdjustmentFlow({
  adjust,
  walletPaise,
  onDone,
}: {
  adjust: ReturnType<typeof useManualAdjustment>;
  walletPaise: number;
  onDone: () => void;
}) {
  const [draft, dispatch] = useReducer(advanceAdjustment, undefined, () => startAdjustment());
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});
  const failure = actionError(adjust.error);
  const failureMessage = failure && adjustmentOutcomeUnknown(failure.code) ? ADJUSTMENT_MAY_HAVE_POSTED : failure?.message;

  if (draft.step === "done") {
    const { adjustment, balancePaise, replayed } = draft.result;
    return (
      <div className="grid gap-4">
        <Notice tone="success">
          {adjustment.direction === "credit" ? "Credit" : "Debit"} of {formatPaise(adjustment.amountPaise)} posted. The
          wallet balance is now {formatPaise(balancePaise)}.
          {replayed ? " This adjustment had already been recorded, so nothing was posted twice." : ""}
        </Notice>
        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={onDone} autoFocus>
            Done
          </Button>
        </div>
      </div>
    );
  }

  if (draft.step === "confirm") {
    const { payload } = draft;
    const after = resultingBalance(walletPaise, payload.direction, payload.amountPaise);
    const overdraws = after < 0;

    const post = () =>
      adjust.mutate(
        { ...draft.values, idempotencyKey: draft.key },
        { onSuccess: (result) => dispatch({ type: "posted", result }) },
      );

    return (
      <div className="grid gap-4">
        <dl className="hairline grid grid-cols-2 gap-x-4 gap-y-3 rounded-[3px] bg-ink/60 p-4 text-sm">
          <dt className="eyebrow self-center">Action</dt>
          <dd className="text-right font-medium">{payload.direction === "credit" ? "Credit wallet" : "Debit wallet"}</dd>
          <dt className="eyebrow self-center">Amount</dt>
          <dd className="text-right tabular-nums">{formatPaise(payload.amountPaise)}</dd>
          <dt className="eyebrow self-center">Wallet now</dt>
          <dd className="text-right tabular-nums">{formatPaise(walletPaise)}</dd>
          <dt className="eyebrow self-center">Wallet after</dt>
          <dd className={cx("text-right font-semibold tabular-nums", overdraws ? "text-ember" : "text-gold")}>
            {formatPaise(after)}
          </dd>
          <dt className="eyebrow col-span-2">Reason</dt>
          <dd className="col-span-2 whitespace-pre-line text-dust">{payload.reason}</dd>
        </dl>
        {overdraws ? (
          <Notice tone="error">
            This debit is more than the wallet balance shown, so the ledger will refuse it unless the balance has changed.
          </Notice>
        ) : null}
        <div aria-live="assertive">{failure ? <Notice tone="error">{failureMessage}</Notice> : null}</div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            variant="ghost"
            disabled={adjust.isPending}
            onClick={() => {
              setLocalErrors(failure?.errors ?? {});
              adjust.reset();
              dispatch(backToEdit(failure?.code));
            }}
          >
            Back
          </Button>
          <Button onClick={post} disabled={adjust.isPending} aria-busy={adjust.isPending} autoFocus>
            {adjust.isPending
              ? "Posting…"
              : failure && failure.code !== "idempotency_conflict"
                ? "Try again"
                : `Post ${payload.direction} of ${formatPaise(payload.amountPaise)}`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdjustmentForm
      initial={draft.values}
      walletPaise={walletPaise}
      errors={localErrors}
      onReview={(values) => {
        const built = buildAdjustment({ ...values, idempotencyKey: draft.key });
        if (!built.ok) {
          setLocalErrors(built.errors);
          return;
        }
        setLocalErrors({});
        dispatch({ type: "review", values, payload: built.payload });
      }}
    />
  );
}

function AdjustmentForm({
  initial,
  walletPaise,
  errors,
  onReview,
}: {
  initial: AdjustmentFormValues | null;
  walletPaise: number;
  errors: FieldErrors;
  onReview: (values: AdjustmentFormValues) => void;
}) {
  const [reasonLength, setReasonLength] = useState(initial?.reason.trim().length ?? 0);
  const direction = initial?.direction ?? "credit";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onReview(readAdjustmentForm(new FormData(event.currentTarget)));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <p className="text-sm text-dust">
        Current wallet balance <span className="font-medium text-parchment tabular-nums">{formatPaise(walletPaise)}</span>
      </p>
      <fieldset className="grid gap-1.5">
        <legend className="eyebrow mb-1.5">Direction</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["credit", "debit"] as const).map((option) => (
            <label
              key={option}
              className="hairline flex cursor-pointer items-center gap-2 rounded-[3px] bg-horizon px-3 py-2 text-sm has-[:checked]:border-gold has-[:checked]:bg-gold/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60"
            >
              <input type="radio" name="direction" value={option} defaultChecked={direction === option} className="accent-gold" />
              {option === "credit" ? "Credit wallet (add money)" : "Debit wallet (remove money)"}
            </label>
          ))}
        </div>
        {errors.direction ? <p className="text-xs text-ember">{errors.direction.join(" ")}</p> : null}
      </fieldset>
      <Field name="amount" label="Amount (₹)" error={errors.amount} hint={`Up to ${MAX_ADJUSTMENT_LABEL}, paise allowed`}>
        <TextInput
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={initial?.amount ?? ""}
          required
          autoFocus
          className="text-right tabular-nums"
          invalid={Boolean(errors.amount)}
        />
      </Field>
      <Field
        name="reason"
        label="Reason"
        error={errors.reason}
        hint={`${reasonLength} of at least ${MANUAL_ADJUSTMENT_REASON_MIN_LENGTH} characters`}
      >
        <TextArea
          name="reason"
          defaultValue={initial?.reason ?? ""}
          onChange={(event) => setReasonLength(event.target.value.trim().length)}
          required
          maxLength={500}
          rows={3}
          invalid={Boolean(errors.reason)}
        />
      </Field>
      {errors._ ? <Notice tone="error">{errors._.join(" ")}</Notice> : null}
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit">Review adjustment</Button>
      </div>
    </form>
  );
}
