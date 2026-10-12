"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CUSTOMER_STATUS_REASON_MIN_LENGTH, formatPaise } from "@nextera/contracts";
import type { AdminCustomerDetail } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { actionError } from "@/lib/customers/cache";
import type { CustomerStatusAction } from "@/lib/customers/form";
import { accountLabel } from "@/lib/customers/labels";
import { useChangeCustomerStatus } from "@/lib/customers/mutations";

const copy: Record<CustomerStatusAction, { title: string; description: string; confirm: string; pending: string }> = {
  block: {
    title: "Block customer",
    description: "Blocking signs the customer out everywhere and stops sign-in, investments and withdrawals until unblocked.",
    confirm: "Block customer",
    pending: "Blocking…",
  },
  unblock: {
    title: "Unblock customer",
    description: "The customer can sign in and move money again.",
    confirm: "Unblock customer",
    pending: "Unblocking…",
  },
  close: {
    title: "Close customer account",
    description:
      "Closing is permanent. A closed account cannot sign in, be edited, re-register with this number or take ledger postings. Every balance must be zero first.",
    confirm: "Close account",
    pending: "Closing…",
  },
};

export function StatusChangeDialog({
  detail,
  action,
  onClose,
}: {
  detail: AdminCustomerDetail;
  action: CustomerStatusAction | null;
  onClose: () => void;
}) {
  const change = useChangeCustomerStatus(detail.customer.id);
  const text = action ? copy[action] : null;

  function close() {
    change.reset();
    onClose();
  }

  return (
    <Dialog
      open={action !== null}
      onClose={close}
      dismissible={!change.isPending}
      closeButton
      backdropClose
      title={text?.title ?? ""}
      description={text?.description}
    >
      {action ? <StatusChangeForm detail={detail} action={action} change={change} onDone={close} /> : null}
    </Dialog>
  );
}

function StatusChangeForm({
  detail,
  action,
  change,
  onDone,
}: {
  detail: AdminCustomerDetail;
  action: CustomerStatusAction;
  change: ReturnType<typeof useChangeCustomerStatus>;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const failure = actionError(change.error);
  const errors = failure?.errors ?? {};
  const nonZero = detail.balances.filter((balance) => balance.balancePaise !== 0);
  const tooShort = reason.trim().length < CUSTOMER_STATUS_REASON_MIN_LENGTH;
  const text = copy[action];

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tooShort) return;
    change.mutate({ action, reason }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {action === "close" && nonZero.length > 0 ? (
        <Notice tone="info">
          <p>The backend will refuse to close this account while these balances are not zero:</p>
          <ul className="mt-1 list-disc pl-5">
            {nonZero.map((balance) => (
              <li key={balance.account}>
                {accountLabel(balance.account)}: <span className="tabular-nums">{formatPaise(balance.balancePaise)}</span>
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <Field
        name="reason"
        label="Reason (recorded in the audit log)"
        error={errors.reason}
        hint={`At least ${CUSTOMER_STATUS_REASON_MIN_LENGTH} characters`}
      >
        <TextArea
          name="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          maxLength={500}
          rows={3}
          autoFocus
          invalid={Boolean(errors.reason)}
        />
      </Field>

      <div aria-live="assertive">
        {failure ? (
          <Notice tone="error">
            <p>{failure.message}</p>
            {errors.closure?.length ? (
              <ul className="mt-1 list-disc pl-5">
                {errors.closure.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : null}
          </Notice>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onDone} disabled={change.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant={action === "unblock" ? "primary" : "danger"}
          disabled={change.isPending || tooShort}
          aria-busy={change.isPending}
        >
          {change.isPending ? text.pending : text.confirm}
        </Button>
      </div>
    </form>
  );
}
