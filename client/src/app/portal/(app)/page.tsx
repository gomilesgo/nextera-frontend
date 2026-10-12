import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { DashboardView } from "@/components/portal/DashboardView";
import { loadInvestmentSummary } from "@/lib/queries/investmentLoaders";
import { investmentSummaryQuery } from "@/lib/queries/investments";
import { loadBankAccounts, loadPlans } from "@/lib/queries/loaders";
import { bankAccountsQuery, plansQuery } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { token } = await requireCustomer();
  const queryClient = getServerQueryClient();
  const [plans, bank, summary] = await Promise.allSettled([loadPlans(), loadBankAccounts(token), loadInvestmentSummary(token)]);
  if (bank.status === "rejected") unstable_rethrow(bank.reason);
  if (summary.status === "rejected") unstable_rethrow(summary.reason);
  if (plans.status === "fulfilled") queryClient.setQueryData(plansQuery().queryKey, plans.value);
  else console.error("[dashboard] plans unavailable:", plans.reason instanceof Error ? plans.reason.message : plans.reason);
  if (bank.status === "fulfilled") queryClient.setQueryData(bankAccountsQuery().queryKey, bank.value);
  else console.error("[dashboard] bank accounts unavailable:", bank.reason instanceof Error ? bank.reason.message : bank.reason);
  if (summary.status === "fulfilled") queryClient.setQueryData(investmentSummaryQuery().queryKey, summary.value);
  else console.error("[dashboard] investment summary unavailable:", summary.reason instanceof Error ? summary.reason.message : summary.reason);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardView />
    </HydrationBoundary>
  );
}
