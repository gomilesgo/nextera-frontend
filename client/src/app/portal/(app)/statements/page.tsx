import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { StatementsView } from "@/components/statements/StatementsView";
import { loadFirstStatementPage, loadInvestments } from "@/lib/queries/investmentLoaders";
import { investmentsQuery } from "@/lib/queries/investments";
import { getServerQueryClient } from "@/lib/queries/server";
import { statementsQuery } from "@/lib/queries/statements";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Statements" };

export default async function StatementsPage() {
  const { token } = await requireCustomer();
  const queryClient = getServerQueryClient();
  const [firstPage, investments] = await Promise.all([loadFirstStatementPage(token), loadInvestments(token)]);
  queryClient.setQueryData(statementsQuery().queryKey, { pages: [firstPage], pageParams: [null] });
  queryClient.setQueryData(investmentsQuery().queryKey, investments);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StatementsView />
    </HydrationBoundary>
  );
}
