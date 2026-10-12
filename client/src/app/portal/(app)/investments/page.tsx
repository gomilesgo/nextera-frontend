import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { InvestmentsView } from "@/components/investments/InvestmentsView";
import { loadInvestments } from "@/lib/queries/investmentLoaders";
import { investmentsQuery } from "@/lib/queries/investments";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Investments" };

export default async function InvestmentsPage() {
  const { token } = await requireCustomer();
  const queryClient = getServerQueryClient();
  queryClient.setQueryData(investmentsQuery().queryKey, await loadInvestments(token));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InvestmentsView />
    </HydrationBoundary>
  );
}
