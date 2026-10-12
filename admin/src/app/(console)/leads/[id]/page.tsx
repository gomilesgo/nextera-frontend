import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { loadLead } from "@/lib/leads/api";
import { can } from "@/lib/permissions";
import { leadQueries } from "@/lib/queries/leads";
import { planQueries, staffQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { loadPlans } from "@/lib/plans/api";
import { requirePermission } from "@/lib/session";
import { isUuid } from "@/lib/shape";
import { loadStaffList } from "@/lib/team/api";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  const { staff, token } = await requirePermission("leads.view");
  if (!isUuid(id)) notFound();
  const detail = await loadLead(token, id);
  if (!detail) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(leadQueries.detail(id).queryKey, detail);
  await Promise.all([
    detail.lead.planId ? queryClient.prefetchQuery({ ...planQueries.list(), queryFn: () => loadPlans(token) }) : Promise.resolve(),
    can(staff.role, "staff.manage")
      ? queryClient.prefetchQuery({ ...staffQueries.list(), queryFn: () => loadStaffList(token) })
      : Promise.resolve(),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LeadDetail leadId={id} canWrite={can(staff.role, "leads.write")} />
    </HydrationBoundary>
  );
}
