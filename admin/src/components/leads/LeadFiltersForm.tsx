"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { leadStatuses } from "@nextera/contracts";
import { AssigneeFilterOptions } from "@/components/desk/AssigneeFilterOptions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { SEARCH_MAX_LENGTH, formValues } from "@/lib/filters";
import { hasLeadFilters, leadFiltersPath, parseLeadFilters } from "@/lib/leads/filters";
import type { LeadFilters } from "@/lib/leads/filters";
import { leadStatusLabels } from "@/lib/leads/labels";

export function LeadFiltersForm({ filters }: { filters: LeadFilters }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = formValues(new FormData(event.currentTarget));
    if (values.from && values.to && values.from > values.to) {
      setError("The start date must be on or before the end date.");
      return;
    }
    setError(null);
    router.push(leadFiltersPath(parseLeadFilters(values)));
  }

  return (
    <form
      key={leadFiltersPath(filters)}
      onSubmit={onSubmit}
      role="search"
      aria-label="Filter leads"
      noValidate
      className="hairline grid gap-3 rounded-[3px] bg-horizon/40 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
    >
      <Field name="q" label="Search">
        <TextInput
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder="Name, phone, email or NXL ref"
          maxLength={SEARCH_MAX_LENGTH}
        />
      </Field>
      <Field name="status" label="Status">
        <SelectInput name="status" defaultValue={filters.status ?? ""}>
          <option value="">Any status</option>
          {leadStatuses.map((status) => (
            <option key={status} value={status}>
              {leadStatusLabels[status]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field name="from" label="Received from (IST)">
        <TextInput name="from" type="date" defaultValue={filters.from ?? ""} invalid={Boolean(error)} />
      </Field>
      <Field name="to" label="Received to (IST)">
        <TextInput name="to" type="date" defaultValue={filters.to ?? ""} />
      </Field>
      <Field name="assignee" label="Assignee">
        <SelectInput name="assignee" defaultValue={filters.assignee ?? ""}>
          <AssigneeFilterOptions selected={filters.assignee} />
        </SelectInput>
      </Field>
      <div className="flex items-end gap-2">
        <Button type="submit">Apply</Button>
        {hasLeadFilters(filters) ? (
          <ButtonLink href="/leads" variant="ghost">
            Clear
          </ButtonLink>
        ) : null}
      </div>
      <p id="from-error" aria-live="polite" className="text-xs text-ember sm:col-span-2 lg:col-span-6 empty:hidden">
        {error ?? ""}
      </p>
    </form>
  );
}
