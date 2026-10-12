"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LEAD_LIMITS, LEAD_NOTES_MAX } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { actionErrorMessage, fieldErrors } from "@/lib/actions/outcome";
import { useCreateLead } from "@/lib/leads/mutations";
import { usePlans } from "@/lib/queries/hooks";
import { useAssignees } from "@/lib/useAssignees";

export function NewLeadDialog() {
  const router = useRouter();
  const create = useCreateLead();
  const [open, setOpen] = useState(false);
  const plans = usePlans();
  const { options } = useAssignees();
  const errors = fieldErrors(create.error);
  const message = actionErrorMessage(create.error);

  function start() {
    create.reset();
    setOpen(true);
  }

  function close() {
    if (create.isPending) return;
    create.reset();
    setOpen(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate(new FormData(event.currentTarget), {
      onSuccess: (lead) => {
        setOpen(false);
        router.push(`/leads/${lead.id}`);
      },
    });
  }

  const planOptions = (plans.data?.plans ?? []).filter((plan) => plan.status !== "archived");

  return (
    <>
      <Button onClick={start}>Add lead</Button>
      <Dialog
        open={open}
        onClose={close}
        dismissible={!create.isPending}
        title="Add a lead"
        description="For enquiries that came in by phone, email or in person. Staff-added leads skip the website limits."
        className="w-[min(40rem,calc(100vw-2rem))]"
      >
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Name" error={errors.name}>
              <TextInput name="name" required maxLength={LEAD_LIMITS.name} autoComplete="off" invalid={Boolean(errors.name)} autoFocus />
            </Field>
            <Field name="phone" label="Mobile" error={errors.phone} hint="Indian mobile, with or without +91">
              <TextInput name="phone" type="tel" required maxLength={LEAD_LIMITS.phone} autoComplete="off" invalid={Boolean(errors.phone)} />
            </Field>
            <Field name="email" label="Email (optional)" error={errors.email}>
              <TextInput name="email" type="email" maxLength={LEAD_LIMITS.email} autoComplete="off" invalid={Boolean(errors.email)} />
            </Field>
            <Field name="interest" label="Interest (optional)" error={errors.interest}>
              <TextInput name="interest" maxLength={LEAD_LIMITS.interest} autoComplete="off" invalid={Boolean(errors.interest)} />
            </Field>
            <Field name="planId" label="Plan (optional)" error={errors.planId}>
              <SelectInput name="planId" defaultValue="" invalid={Boolean(errors.planId)}>
                <option value="">No specific plan</option>
                {planOptions.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field name="amount" label="Amount in ₹ (optional)" error={errors.amount}>
              <TextInput name="amount" inputMode="decimal" autoComplete="off" invalid={Boolean(errors.amount)} />
            </Field>
            <Field name="assigneeId" label="Assign to" error={errors.assigneeId}>
              <SelectInput name="assigneeId" defaultValue="" invalid={Boolean(errors.assigneeId)}>
                <option value="">Unassigned</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <Field name="message" label="What they asked (optional)" error={errors.message}>
            <TextArea name="message" rows={3} maxLength={LEAD_LIMITS.message} invalid={Boolean(errors.message)} />
          </Field>
          <Field name="notes" label="Internal notes (optional)" error={errors.notes}>
            <TextArea name="notes" rows={2} maxLength={LEAD_NOTES_MAX} invalid={Boolean(errors.notes)} />
          </Field>
          <p aria-live="polite" className="min-h-4 text-xs text-ember">
            {message ?? ""}
          </p>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={close} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending} aria-busy={create.isPending}>
              {create.isPending ? "Adding…" : "Add lead"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
