import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { LeadFiltersForm } from "@/components/leads/LeadFiltersForm";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadLeads } from "@/lib/leads/api";
import { hasLeadFilters, leadFiltersPath, leadListParams, parseLeadFilters } from "@/lib/leads/filters";
import { can } from "@/lib/permissions";
import { leadQueries } from "@/lib/queries/leads";
import { staffQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";
import { loadAssignableStaff } from "@/lib/team/api";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const { staff, token } = await requirePermission("leads.view");
  const filters = parseLeadFilters(await searchParams);
  const params = leadListParams(filters, staff.id);

  const queryClient = getServerQueryClient();
  await Promise.all([
    queryClient.fetchInfiniteQuery({
      ...leadQueries.list(params),
      queryFn: ({ pageParam }) => loadLeads(token, params, pageParam),
    }),
    queryClient.prefetchQuery({ ...staffQueries.assignable(), queryFn: () => loadAssignableStaff(token) }),
  ]);

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Sales"
        title="Leads"
        description="Website enquiries and leads added by staff, newest first. Dates are India time."
        actions={can(staff.role, "leads.write") ? <NewLeadDialog /> : null}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <LeadFiltersForm filters={filters} />
        <LeadsTable key={leadFiltersPath(filters)} params={params} filtered={hasLeadFilters(filters)} />
      </HydrationBoundary>
    </div>
  );
}
