import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { PlanDetail } from "@/components/plans/PlanDetail";
import { can } from "@/lib/permissions";
import { loadPlan } from "@/lib/plans/api";
import { planQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { firstParam } from "@/lib/request";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Plan" };

const savedMessages: Record<string, string> = {
  created: "Plan created.",
  updated: "Changes saved.",
};

export default async function PlanPage({ params, searchParams }: PageProps<"/plans/[id]">) {
  const { id } = await params;
  const { staff, token } = await requirePermission("plans.view");
  const plan = await loadPlan(token, id);
  if (!plan) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(planQueries.detail(id).queryKey, plan);
  const saved = savedMessages[firstParam((await searchParams).saved) ?? ""];

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PlanDetail planId={id} canWrite={can(staff.role, "plans.write")} savedMessage={saved} />
    </HydrationBoundary>
  );
}
