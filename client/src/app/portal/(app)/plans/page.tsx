import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { PlansView } from "@/components/portal/PlansView";
import { todayInIndia } from "@/lib/dates";
import { loadPlans } from "@/lib/queries/loaders";
import { plansQuery } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  await requireCustomer();
  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery(plansQuery(loadPlans));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PlansView startDate={todayInIndia()} />
    </HydrationBoundary>
  );
}
