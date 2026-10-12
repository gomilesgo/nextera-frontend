import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { WithdrawalDetail } from "@/components/withdrawals/WithdrawalDetail";
import { loadWithdrawalDetail } from "@/lib/withdrawals/api";
import { withdrawalQueries } from "@/lib/queries/withdrawals";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";
import { isUuid } from "@/lib/shape";

export const metadata: Metadata = { title: "Withdrawal" };

export default async function WithdrawalPage({ params }: PageProps<"/withdrawals/[id]">) {
  const id = (await params).id.toLowerCase();
  const { token, staff } = await requirePermission("withdrawals.view");
  if (!isUuid(id)) notFound();
  const detail = await loadWithdrawalDetail(token, id);
  if (!detail) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(withdrawalQueries.detail(id).queryKey, detail!);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WithdrawalDetail withdrawalId={id} staff={staff} />
    </HydrationBoundary>
  );
}
