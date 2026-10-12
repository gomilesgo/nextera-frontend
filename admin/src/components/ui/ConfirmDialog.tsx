"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Field, TextArea } from "./Field";

export const REASON_MIN_LENGTH = 3;
export const REASON_MAX_LENGTH = 500;

type ConfirmProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  tone?: "primary" | "danger";
  pending?: boolean;
  error?: string | null;
  reason?: { label: string; hint?: string; errors?: string[] };
  children?: ReactNode;
};

export function ConfirmDialog({ open, onClose, title, description, pending = false, ...body }: ConfirmProps) {
  function close() {
    if (!pending) onClose();
  }

  return (
    <Dialog open={open} onClose={close} dismissible={!pending} title={title} description={description}>
      <ConfirmBody {...body} pending={pending} onCancel={close} />
    </Dialog>
  );
}

function ConfirmBody({
  onConfirm,
  onCancel,
  confirmLabel,
  pendingLabel,
  tone = "primary",
  pending,
  error,
  reason,
  children,
}: Omit<ConfirmProps, "open" | "onClose" | "title" | "description"> & { onCancel: () => void; pending: boolean }) {
  const [text, setText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const reasonErrors = localError ? [localError] : reason?.errors;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason) {
      onConfirm("");
      return;
    }
    const trimmed = text.trim();
    if (trimmed.length < REASON_MIN_LENGTH) {
      setLocalError("Give a reason the customer can act on");
      return;
    }
    setLocalError(null);
    onConfirm(trimmed);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {children}
      {reason ? (
        <Field name="decision-reason" label={reason.label} error={reasonErrors} hint={reason.hint}>
          <TextArea
            name="decision-reason"
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
            minLength={REASON_MIN_LENGTH}
            maxLength={REASON_MAX_LENGTH}
            rows={3}
            invalid={Boolean(reasonErrors?.length)}
            autoFocus
          />
        </Field>
      ) : null}
      <p aria-live="polite" className="min-h-4 text-xs text-ember">
        {error ?? ""}
      </p>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant={tone} disabled={pending} aria-busy={pending} autoFocus={!reason}>
          {pending ? (pendingLabel ?? "Working…") : confirmLabel}
        </Button>
      </div>
    </form>
  );
}
