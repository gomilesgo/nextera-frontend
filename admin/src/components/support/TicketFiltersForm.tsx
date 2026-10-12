"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ticketCategories, ticketPriorities, ticketStatuses } from "@nextera/contracts";
import { AssigneeFilterOptions } from "@/components/desk/AssigneeFilterOptions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { SEARCH_MAX_LENGTH, formValues } from "@/lib/filters";
import { ALL_STATUSES, hasTicketFilters, parseTicketFilters, ticketFiltersPath } from "@/lib/support/filters";
import type { TicketFilters } from "@/lib/support/filters";
import { ticketCategoryLabels, ticketPriorityLabels, ticketStatusLabels } from "@/lib/support/labels";

export function TicketFiltersForm({ filters }: { filters: TicketFilters }) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(ticketFiltersPath(parseTicketFilters(formValues(new FormData(event.currentTarget)))));
  }

  return (
    <form
      key={ticketFiltersPath(filters)}
      onSubmit={onSubmit}
      role="search"
      aria-label="Filter tickets"
      noValidate
      className="hairline grid gap-3 rounded-[3px] bg-horizon/40 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
    >
      <Field name="q" label="Search">
        <TextInput
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder="Ref, subject, customer name or phone"
          maxLength={SEARCH_MAX_LENGTH}
        />
      </Field>
      <Field name="status" label="Status">
        <SelectInput name="status" defaultValue={filters.status}>
          {ticketStatuses.map((status) => (
            <option key={status} value={status}>
              {ticketStatusLabels[status]}
            </option>
          ))}
          <option value={ALL_STATUSES}>Any status</option>
        </SelectInput>
      </Field>
      <Field name="category" label="Category">
        <SelectInput name="category" defaultValue={filters.category ?? ""}>
          <option value="">Any category</option>
          {ticketCategories.map((category) => (
            <option key={category} value={category}>
              {ticketCategoryLabels[category]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field name="priority" label="Priority">
        <SelectInput name="priority" defaultValue={filters.priority ?? ""}>
          <option value="">Any priority</option>
          {ticketPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {ticketPriorityLabels[priority]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field name="assignee" label="Assignee">
        <SelectInput name="assignee" defaultValue={filters.assignee ?? ""}>
          <AssigneeFilterOptions selected={filters.assignee} />
        </SelectInput>
      </Field>
      <div className="flex items-end gap-2">
        <Button type="submit">Apply</Button>
        {hasTicketFilters(filters) || filters.status !== "open" ? (
          <ButtonLink href="/support" variant="ghost">
            Clear
          </ButtonLink>
        ) : null}
      </div>
    </form>
  );
}
