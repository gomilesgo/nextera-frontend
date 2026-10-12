import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { BatchDetail } from "@/components/withdrawals/BatchDetail";
import { loadBatchDetail } from "@/lib/withdrawals/api";
import { withdrawalQueries } from "@/lib/queries/withdrawals";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";
import { isUuid } from "@/lib/shape";

export const metadata: Metadata = { title: "Payout batch" };

export default async function BatchDetailPage({ params }: PageProps<"/withdrawals/batches/[id]">) {
  const id = (await params).id.toLowerCase();
  const { token } = await requirePermission("withdrawals.view");
  if (!isUuid(id)) notFound();
  const detail = await loadBatchDetail(token, id);
  if (!detail) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(withdrawalQueries.batchDetail(id).queryKey, detail!);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BatchDetail batchId={id} />
    </HydrationBoundary>
  );
}
