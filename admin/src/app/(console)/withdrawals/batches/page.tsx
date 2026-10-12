import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { BatchesTable } from "@/components/withdrawals/BatchesTable";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadBatches } from "@/lib/withdrawals/api";
import { withdrawalQueries } from "@/lib/queries/withdrawals";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Payout batches" };

export default async function BatchesPage() {
  const { token } = await requirePermission("withdrawals.view");

  const queryClient = getServerQueryClient();
  await queryClient.fetchInfiniteQuery({
    ...withdrawalQueries.batchList(),
    queryFn: ({ pageParam }) => loadBatches(token, (pageParam as string | null) ?? undefined),
    initialPageParam: null as string | null,
  });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Finance"
        title="Payout batches"
        description="Cashfree batch payout transfers. Each batch is created from approved withdrawals."
        actions={
          <ButtonLink href="/withdrawals" variant="ghost" size="sm">
            Back to withdrawals
          </ButtonLink>
        }
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <BatchesTable />
      </HydrationBoundary>
    </div>
  );
}
