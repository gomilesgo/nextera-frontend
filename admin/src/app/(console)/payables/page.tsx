import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { PayablesCustomersTable } from "@/components/payables/PayablesCustomersTable";
import { PayablesSummaryCards } from "@/components/payables/PayablesSummaryCards";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadPayablesCustomers, loadPayablesSummary } from "@/lib/payables/api";
import { PAYABLES_PAGE_SIZE, payablesQueries } from "@/lib/queries/payables";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Payables" };

export default async function PayablesPage() {
  const { token } = await requirePermission("payables.view");

  const queryClient = getServerQueryClient();
  const summary = await loadPayablesSummary(token);
  if (summary) {
    queryClient.setQueryData(payablesQueries.summary().queryKey, summary);
  }
  await queryClient.prefetchInfiniteQuery({
    ...payablesQueries.customers("totalPayable_desc"),
    queryFn: () =>
      loadPayablesCustomers(token, {
        cursor: undefined,
        limit: PAYABLES_PAGE_SIZE,
        sort: "totalPayable_desc",
      }),
    initialPageParam: null,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Payables"
        description="Outstanding obligations: wallet balances, pending withdrawals, returns due in 30 days, and principal maturing in 30 and 90 days."
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <section aria-labelledby="payables-summary-heading">
          <h2 id="payables-summary-heading" className="mb-3 text-sm font-medium text-dust">
            Summary
          </h2>
          <PayablesSummaryCards />
        </section>
        <section aria-labelledby="payables-customers-heading">
          <h2 id="payables-customers-heading" className="mb-3 text-sm font-medium text-dust">
            By customer
          </h2>
          <PayablesCustomersTable />
        </section>
      </HydrationBoundary>
    </div>
  );
}
