"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { customerStatuses, dateRangeIsOrdered, kycStatuses } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { parseCustomerFilters } from "@/lib/customers/filters";
import type { CustomerFilters } from "@/lib/customers/filters";
import { customerStatusLabels, kycStatusLabels } from "@/lib/customers/labels";

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function CustomerFiltersForm({
  filters,
  onApply,
  onClear,
}: {
  filters: CustomerFilters;
  onApply: (filters: CustomerFilters) => void;
  onClear: () => void;
}) {
  const [rangeError, setRangeError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const createdFrom = read(data, "createdFrom");
    const createdTo = read(data, "createdTo");
    if (!dateRangeIsOrdered(createdFrom || undefined, createdTo || undefined)) {
      setRangeError("The end date must not be before the start date");
      return;
    }
    setRangeError(null);
    onApply(
      parseCustomerFilters({
        q: read(data, "q"),
        status: read(data, "status"),
        kycStatus: read(data, "kycStatus"),
        createdFrom,
        createdTo,
        limit: String(filters.limit),
      }),
    );
  }

  return (
    <form
      role="search"
      aria-label="Filter customers"
      onSubmit={onSubmit}
      className="hairline grid gap-3 rounded-[3px] bg-horizon/40 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,2fr)_repeat(4,minmax(8rem,1fr))_auto]"
    >
      <Field name="q" label="Search">
        <TextInput name="q" type="search" defaultValue={filters.q ?? ""} placeholder="Name, email or mobile" maxLength={100} />
      </Field>
      <Field name="status" label="Status">
        <SelectInput name="status" defaultValue={filters.status ?? ""}>
          <option value="">Any status</option>
          {customerStatuses.map((status) => (
            <option key={status} value={status}>
              {customerStatusLabels[status]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field name="kycStatus" label="KYC">
        <SelectInput name="kycStatus" defaultValue={filters.kycStatus ?? ""}>
          <option value="">Any KYC</option>
          {kycStatuses.map((status) => (
            <option key={status} value={status}>
              {kycStatusLabels[status]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field name="createdFrom" label="Created from">
        <TextInput name="createdFrom" type="date" defaultValue={filters.createdFrom ?? ""} />
      </Field>
      <Field name="createdTo" label="Created to" error={rangeError ?? undefined}>
        <TextInput name="createdTo" type="date" defaultValue={filters.createdTo ?? ""} invalid={Boolean(rangeError)} />
      </Field>
      <div className="flex items-end gap-2">
        <Button type="submit">Apply</Button>
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </form>
  );
}
