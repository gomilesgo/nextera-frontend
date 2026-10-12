import Form from "next/form";
import { investmentStatuses } from "@nextera/contracts";
import type { Plan } from "@nextera/contracts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { CUSTOMER_SEARCH_MAX, hasFilters } from "@/lib/investments/filters";
import type { InvestmentFilters } from "@/lib/investments/filters";
import { investmentStatusLabels } from "@/lib/investments/labels";

export function InvestmentFilterForm({ filters, plans }: { filters: InvestmentFilters; plans: readonly Plan[] }) {
  const planKnown = !filters.planId || plans.some((plan) => plan.id === filters.planId);
  return (
    <Form
      action="/investments"
      role="search"
      aria-label="Filter investments"
      className="hairline grid items-end gap-3 rounded-[3px] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]"
    >
      <Field name="status" label="Status">
        <SelectInput name="status" defaultValue={filters.status ?? ""}>
          <option value="">Any status</option>
          {investmentStatuses.map((status) => (
            <option key={status} value={status}>
              {investmentStatusLabels[status]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field name="plan" label="Plan">
        <SelectInput name="plan" defaultValue={filters.planId ?? ""}>
          <option value="">Any plan</option>
          {planKnown ? null : <option value={filters.planId}>Selected plan</option>}
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field name="customer" label="Customer">
        <TextInput
          name="customer"
          type="search"
          defaultValue={filters.customerId ?? filters.customerSearch ?? ""}
          placeholder="Name, mobile, email or customer id"
          maxLength={CUSTOMER_SEARCH_MAX}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit">Apply</Button>
        {hasFilters(filters) ? (
          <ButtonLink href="/investments" variant="ghost">
            Clear
          </ButtonLink>
        ) : null}
      </div>
    </Form>
  );
}
