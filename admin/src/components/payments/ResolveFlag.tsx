"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { paymentFlagResolutions } from "@nextera/contracts";
import type { PaymentFlagResolution } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { fieldErrors } from "@/lib/actions/outcome";
import type { FieldErrors } from "@/lib/actions/outcome";
import { cx } from "@/lib/cx";
import { resolveErrorMessage } from "@/lib/payments/messages";
import { useResolveFlag } from "@/lib/payments/mutations";
import { NOTE_MAX_LENGTH, emptyResolveDraft, parseResolution } from "@/lib/payments/resolve";
import type { ActivationAvailability, ResolveDraft } from "@/lib/payments/resolve";

const descriptions: Record<PaymentFlagResolution, string> = {
  refunded: "The money was returned to the customer from the Cashfree dashboard.",
  posted_manually: "Staff posted the money to the ledger with a manual adjustment.",
  activated: "A later confirmation activated the investment from this payment.",
};

const titles: Record<PaymentFlagResolution, string> = {
  refunded: "Refunded in Cashfree",
  posted_manually: "Posted manually to the ledger",
  activated: "Investment activated",
};

const activationNotes: Record<ActivationAvailability, string | null> = {
  available: null,
  unavailable: "Not available: this payment has not been paid and activated.",
  unknown: "The server checks that this payment went on to activate its investment.",
};

type ResolveMutation = ReturnType<typeof useResolveFlag>;

export function ResolveFlag({ flagId, activation }: { flagId: string; activation: ActivationAvailability }) {
  const mutation = useResolveFlag(flagId);
  const [open, setOpen] = useState(false);
  const pending = mutation.isPending;

  function show() {
    mutation.reset();
    setOpen(true);
  }

  function close() {
    if (!pending) setOpen(false);
  }

  return (
    <>
      <Button onClick={show}>Resolve flag</Button>
      <Dialog
        open={open}
        onClose={close}
        dismissible={!pending}
        title="Resolve this payment flag"
        description="Record what was done about this payment. The resolution and your note go to the audit log and cannot be changed later."
      >
        <ResolveForm
          mutation={mutation}
          activation={activation}
          onCancel={close}
          onResolved={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}

export function ResolveForm({
  mutation,
  activation,
  onCancel,
  onResolved,
}: {
  mutation: ResolveMutation;
  activation: ActivationAvailability;
  onCancel: () => void;
  onResolved: () => void;
}) {
  const [draft, setDraft] = useState<ResolveDraft>(emptyResolveDraft);
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});
  const pending = mutation.isPending;
  const errors: FieldErrors = { ...fieldErrors(mutation.error), ...localErrors };
  const message = resolveErrorMessage(mutation.error);

  function update(patch: Partial<ResolveDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setLocalErrors({});
    if (mutation.isError) mutation.reset();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseResolution(draft);
    if (!parsed.ok) {
      setLocalErrors(parsed.errors);
      return;
    }
    if (parsed.data.resolution === "activated" && activation === "unavailable") {
      setLocalErrors({ resolution: [activationNotes.unavailable ?? ""] });
      return;
    }
    setLocalErrors({});
    mutation.mutate(draft, { onSuccess: onResolved });
  }

  const resolutionErrors = errors.resolution ?? [];

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <fieldset
        className="grid gap-2"
        aria-describedby={resolutionErrors.length ? "resolution-error" : undefined}
        aria-invalid={resolutionErrors.length ? true : undefined}
        disabled={pending}
      >
        <legend className="eyebrow mb-1">Resolution</legend>
        {paymentFlagResolutions.map((resolution) => {
          const disabled = resolution === "activated" && activation === "unavailable";
          const note = resolution === "activated" ? activationNotes[activation] : null;
          const selected = draft.resolution === resolution;
          return (
            <label
              key={resolution}
              className={cx(
                "hairline flex gap-3 rounded-[3px] px-3 py-2.5 text-sm transition-colors",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-ink",
                selected && "border-gold/60 bg-ink",
              )}
            >
              <input
                type="radio"
                name="resolution"
                value={resolution}
                checked={selected}
                disabled={disabled}
                onChange={() => update({ resolution })}
                className="mt-1 accent-[var(--color-gold)]"
              />
              <span className="grid gap-0.5">
                <span className="font-medium">{titles[resolution]}</span>
                <span className="text-xs text-dust">{descriptions[resolution]}</span>
                {note ? <span className="text-xs text-dust">{note}</span> : null}
              </span>
            </label>
          );
        })}
        {resolutionErrors.length ? (
          <p id="resolution-error" className="text-xs text-ember">
            {resolutionErrors.join(" ")}
          </p>
        ) : null}
      </fieldset>

      {draft.resolution === "refunded" ? (
        <Field name="refundId" label="Cashfree refund id" error={errors.refundId} hint="From the refund in the Cashfree dashboard">
          <TextInput
            name="refundId"
            value={draft.refundId}
            onChange={(event) => update({ refundId: event.target.value })}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            required
            disabled={pending}
            invalid={Boolean(errors.refundId?.length)}
            className="font-mono"
          />
        </Field>
      ) : null}

      {draft.resolution === "posted_manually" ? (
        <Field
          name="ledgerTransactionId"
          label="Ledger transaction id"
          error={errors.ledgerTransactionId}
          hint="The id of the manual adjustment that posted this money"
        >
          <TextInput
            name="ledgerTransactionId"
            value={draft.ledgerTransactionId}
            onChange={(event) => update({ ledgerTransactionId: event.target.value })}
            maxLength={36}
            autoComplete="off"
            spellCheck={false}
            required
            disabled={pending}
            invalid={Boolean(errors.ledgerTransactionId?.length)}
            className="font-mono"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </Field>
      ) : null}

      <Field name="note" label="Note" error={errors.note} hint="3 to 1000 characters, kept in the audit log">
        <TextArea
          name="note"
          value={draft.note}
          onChange={(event) => update({ note: event.target.value })}
          maxLength={NOTE_MAX_LENGTH}
          rows={3}
          required
          disabled={pending}
          invalid={Boolean(errors.note?.length)}
        />
      </Field>

      <p aria-live="polite" className="min-h-4 text-xs text-ember">
        {message ?? ""}
      </p>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Resolving…" : "Resolve flag"}
        </Button>
      </div>
    </form>
  );
}
