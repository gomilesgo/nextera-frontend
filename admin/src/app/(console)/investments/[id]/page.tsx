import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { InvestmentDetail } from "@/components/investments/InvestmentDetail";
import { loadCustomerOrNull, loadInvestmentDetail } from "@/lib/investments/api";
import { investmentQueries } from "@/lib/queries/investments";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";
import { isUuid } from "@/lib/shape";

export const metadata: Metadata = { title: "Investment" };

export default async function InvestmentPage({ params }: PageProps<"/investments/[id]">) {
  const id = (await params).id.toLowerCase();
  const { token } = await requirePermission("investments.view");
  if (!isUuid(id)) notFound();
  const detail = await loadInvestmentDetail(token, id);
  if (!detail) notFound();
  const customer = await loadCustomerOrNull(token, detail.investment.customerId);

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(investmentQueries.detail(id).queryKey, detail);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InvestmentDetail investmentId={id} customer={customer} />
    </HydrationBoundary>
  );
}
