import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { InvestmentDetailView } from "@/components/investments/InvestmentDetailView";
import { loadInvestment } from "@/lib/queries/investmentLoaders";
import { investmentQuery } from "@/lib/queries/investments";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Investment" };

export default async function InvestmentDetailPage({ params }: PageProps<"/portal/investments/[id]">) {
  const { token } = await requireCustomer();
  const { id } = await params;
  const data = await loadInvestment(token, id);
  if (!data) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(investmentQuery(id).queryKey, data);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InvestmentDetailView investmentId={id} />
    </HydrationBoundary>
  );
}
