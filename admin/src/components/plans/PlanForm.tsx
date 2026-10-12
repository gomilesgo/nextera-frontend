"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Plan } from "@nextera/contracts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PlanActionError, errorMessage } from "@/lib/plans/cache";
import { emptyPlanValues, planToValues } from "@/lib/plans/form";
import { useSavePlan } from "@/lib/plans/mutations";

export function PlanForm({ plan }: { plan?: Plan }) {
  const router = useRouter();
  const save = useSavePlan(plan?.id ?? null);
  const values = plan ? planToValues(plan) : emptyPlanValues;
  const slugLocked = Boolean(plan && plan.status !== "draft");
  const errors = save.error instanceof PlanActionError ? save.error.errors : {};
  const message = errorMessage(save.error);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(new FormData(event.currentTarget), {
      onSuccess: (saved) => {
        router.replace(`/plans/${saved.id}?saved=${plan ? "updated" : "created"}`);
      },
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {message ? <Notice tone="error">{message}</Notice> : null}
      {errors._ ? <Notice tone="error">{errors._.join(" ")}</Notice> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Name" error={errors.name}>
          <TextInput name="name" defaultValue={values.name} required maxLength={80} invalid={Boolean(errors.name)} />
        </Field>
        <Field
          name="slug"
          label="Slug"
          error={errors.slug}
          hint={slugLocked ? "Fixed once a plan is published" : "Lowercase letters, numbers and hyphens"}
        >
          <TextInput
            name="slug"
            defaultValue={values.slug}
            required
            maxLength={60}
            disabled={slugLocked}
            className="font-mono"
            invalid={Boolean(errors.slug)}
          />
        </Field>
      </div>

      <Field name="description" label="Description" error={errors.description}>
        <TextArea
          name="description"
          defaultValue={values.description}
          maxLength={2000}
          rows={3}
          invalid={Boolean(errors.description)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field name="rate" label="Annual rate (%)" error={errors.rate} hint="e.g. 12.5">
          <TextInput
            name="rate"
            inputMode="decimal"
            defaultValue={values.rate}
            required
            className="text-right"
            invalid={Boolean(errors.rate)}
          />
        </Field>
        <Field name="tenureMonths" label="Tenure (months)" error={errors.tenureMonths}>
          <TextInput
            name="tenureMonths"
            inputMode="numeric"
            defaultValue={values.tenureMonths}
            required
            className="text-right"
            invalid={Boolean(errors.tenureMonths)}
          />
        </Field>
        <Field name="min" label="Minimum (₹)" error={errors.min}>
          <TextInput
            name="min"
            inputMode="decimal"
            defaultValue={values.min}
            required
            className="text-right"
            invalid={Boolean(errors.min)}
          />
        </Field>
        <Field name="max" label="Maximum (₹)" error={errors.max}>
          <TextInput
            name="max"
            inputMode="decimal"
            defaultValue={values.max}
            required
            className="text-right"
            invalid={Boolean(errors.max)}
          />
        </Field>
      </div>

      {plan ? null : (
        <Field name="status" label="Publish as" error={errors.status} className="sm:max-w-xs">
          <SelectInput name="status" defaultValue={values.status} invalid={Boolean(errors.status)}>
            <option value="draft">Draft (hidden from customers)</option>
            <option value="active">Active (visible to customers)</option>
          </SelectInput>
        </Field>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
          {save.isPending ? "Saving…" : plan ? "Save changes" : "Create plan"}
        </Button>
        <ButtonLink href="/plans" variant="ghost">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
