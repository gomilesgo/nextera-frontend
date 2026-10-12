import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { WithdrawalFilterForm } from "@/components/withdrawals/WithdrawalFilterForm";
import { WithdrawalsTable } from "@/components/withdrawals/WithdrawalsTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadWithdrawals } from "@/lib/withdrawals/api";
import { hasWithdrawalFilters, parseWithdrawalFilters } from "@/lib/withdrawals/filters";
import { withdrawalQueries } from "@/lib/queries/withdrawals";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Withdrawals" };

export default async function WithdrawalsPage({ searchParams }: PageProps<"/withdrawals">) {
  const { token } = await requirePermission("withdrawals.view");
  const resolved = await searchParams;
  const filters = parseWithdrawalFilters(resolved);
  const filtered = hasWithdrawalFilters(filters);

  const queryClient = getServerQueryClient();
  await queryClient.fetchInfiniteQuery({
    ...withdrawalQueries.list(filters),
    queryFn: ({ pageParam }) =>
      loadWithdrawals(token, filters, (pageParam as string | null) ?? undefined),
    initialPageParam: null as string | null,
  });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Finance"
        title="Withdrawals"
        description="Customer withdrawal requests. Approve, reject, or batch-pay approved withdrawals."
      />
      <WithdrawalFilterForm filters={filters} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <WithdrawalsTable filters={filters} filtered={filtered} />
      </HydrationBoundary>
    </div>
  );
}
