import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { InvestStart } from "@/components/invest/InvestStart";
import { amountOrUndefined, parseRupeesInput } from "@/lib/calculator";
import { todayInIndia } from "@/lib/dates";
import { loadBankAccounts, loadPlan } from "@/lib/queries/loaders";
import { bankAccountsQuery, planQuery } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Invest" };

export default async function InvestStartPage({ params, searchParams }: PageProps<"/portal/invest/new/[slug]">) {
  const { customer, token } = await requireCustomer();
  const { slug } = await params;
  const query = await searchParams;
  const amount = Array.isArray(query.amount) ? query.amount[0] : query.amount;

  const data = await loadPlan(slug);
  if (!data) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(planQuery(slug).queryKey, data);
  if (customer.kycStatus === "verified") {
    try {
      queryClient.setQueryData(bankAccountsQuery().queryKey, await loadBankAccounts(token));
    } catch (error) {
      unstable_rethrow(error);
      console.error("[invest] bank accounts unavailable:", error instanceof Error ? error.message : error);
    }
  }
  const initial = amount ? amountOrUndefined(parseRupeesInput(amount)) : undefined;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InvestStart
        slug={slug}
        startDate={todayInIndia()}
        initialAmountPaise={initial !== undefined && initial >= data.plan.minPaise && initial <= data.plan.maxPaise ? initial : undefined}
      />
    </HydrationBoundary>
  );
}
