import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { PlanDetailView } from "@/components/portal/PlanDetailView";
import { amountOrUndefined, parseRupeesInput } from "@/lib/calculator";
import { todayInIndia } from "@/lib/dates";
import { loadPlan } from "@/lib/queries/loaders";
import { planQuery } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Plan" };

export default async function PlanDetailPage({ params, searchParams }: PageProps<"/portal/plans/[slug]">) {
  await requireCustomer();
  const { slug } = await params;
  const query = await searchParams;
  const amount = Array.isArray(query.amount) ? query.amount[0] : query.amount;

  const data = await loadPlan(slug);
  if (!data) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(planQuery(slug).queryKey, data);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PlanDetailView
        slug={slug}
        startDate={todayInIndia()}
        initialAmountPaise={amount ? amountOrUndefined(parseRupeesInput(amount)) : undefined}
      />
    </HydrationBoundary>
  );
}
