import Link from "next/link";
import { Notice } from "@/components/ui/Notice";
import type { AdminCustomer } from "@nextera/contracts";
import { investmentsHref } from "@/lib/investments/filters";
import type { InvestmentFilters } from "@/lib/investments/filters";

export function CustomerMatches({
  filters,
  matches,
}: {
  filters: InvestmentFilters;
  matches: readonly AdminCustomer[] | null;
}) {
  if (matches === null) {
    return <Notice tone="error">Customer search is unavailable right now. Paste the customer id instead.</Notice>;
  }
  if (matches.length === 0) {
    return (
      <div className="hairline rounded-[3px] px-4 py-8 text-center text-sm text-dust">
        No customers match &ldquo;{filters.customerSearch}&rdquo;.
      </div>
    );
  }
  return (
    <section aria-labelledby="matches-heading" className="grid gap-2">
      <h2 id="matches-heading" className="text-sm text-dust">
        Choose a customer to see their investments.
      </h2>
      <ul className="hairline divide-y divide-border rounded-[3px]">
        {matches.map((customer) => (
          <li key={customer.id}>
            <Link
              href={investmentsHref({ status: filters.status, planId: filters.planId, customerId: customer.id })}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-horizon"
            >
              <span className="font-medium">{customer.name ?? "Unnamed customer"}</span>
              <span className="font-mono text-xs text-dust">
                {customer.phone}
                {customer.email ? ` · ${customer.email}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
