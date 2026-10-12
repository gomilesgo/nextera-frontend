import type { Metadata } from "next";
import Link from "next/link";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { CustomerMatches } from "@/components/investments/CustomerMatches";
import { InvestmentFilterForm } from "@/components/investments/InvestmentFilterForm";
import { InvestmentsTable } from "@/components/investments/InvestmentsTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadCustomerMatches, loadCustomerOrNull, loadInvestments } from "@/lib/investments/api";
import { INVESTMENT_PAGE_SIZE, hasFilters, investmentsHref, listFilters, parseInvestmentFilters } from "@/lib/investments/filters";
import { fetchPlans } from "@/lib/plans/api";
import { investmentQueries } from "@/lib/queries/investments";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Investments" };

export default async function InvestmentsPage({ searchParams }: PageProps<"/investments">) {
  const { token } = await requirePermission("investments.view");
  const filters = parseInvestmentFilters(await searchParams);
  const list = listFilters(filters);

  const [plans, customer, matches] = await Promise.all([
    fetchPlans(token).then((result) => (result.ok ? result.data.plans : [])),
    filters.customerId ? loadCustomerOrNull(token, filters.customerId) : Promise.resolve(null),
    filters.customerSearch ? loadCustomerMatches(token, filters.customerSearch) : Promise.resolve(null),
  ]);

  const queryClient = getServerQueryClient();
  if (!filters.customerSearch) {
    await queryClient.fetchInfiniteQuery({
      ...investmentQueries.list(list),
      queryFn: ({ pageParam }) =>
        loadInvestments(token, { ...list, cursor: pageParam ?? undefined, limit: INVESTMENT_PAGE_SIZE }),
    });
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Money"
        title="Investments"
        description="Every investment intent and bond, newest first. Open one to see its terms, returns, payment attempts and documents."
      />
      <InvestmentFilterForm key={investmentsHref(filters)} filters={filters} plans={plans} />
      {filters.customerId ? (
        <p className="text-sm text-dust">
          Showing investments for{" "}
          <Link href={`/customers/${filters.customerId}`} className="text-parchment hover:text-gold">
            {customer ? (customer.name ?? customer.phone) : <span className="font-mono">{filters.customerId}</span>}
          </Link>
          {customer?.name ? <span className="font-mono text-xs"> · {customer.phone}</span> : null}.{" "}
          <Link href={investmentsHref({ ...filters, customerId: undefined })} className="underline hover:text-parchment">
            Show all customers
          </Link>
        </p>
      ) : null}
      {filters.customerSearch ? (
        <CustomerMatches filters={filters} matches={matches} />
      ) : (
        <HydrationBoundary state={dehydrate(queryClient)}>
          <InvestmentsTable key={investmentsHref(filters)} filters={list} filtered={hasFilters(filters)} />
        </HydrationBoundary>
      )}
    </div>
  );
}
