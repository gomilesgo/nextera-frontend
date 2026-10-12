import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { TicketFiltersForm } from "@/components/support/TicketFiltersForm";
import { TicketQueue } from "@/components/support/TicketQueue";
import { PageHeader } from "@/components/ui/PageHeader";
import { staffQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { supportQueries } from "@/lib/queries/support";
import { requirePermission } from "@/lib/session";
import { loadTickets } from "@/lib/support/api";
import { hasTicketFilters, parseTicketFilters, ticketFiltersPath, ticketListParams } from "@/lib/support/filters";
import { loadAssignableStaff } from "@/lib/team/api";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage({ searchParams }: PageProps<"/support">) {
  const { staff, token } = await requirePermission("support.view");
  const filters = parseTicketFilters(await searchParams);
  const params = ticketListParams(filters, staff.id);

  const queryClient = getServerQueryClient();
  await Promise.all([
    queryClient.fetchInfiniteQuery({
      ...supportQueries.list(params),
      queryFn: ({ pageParam }) => loadTickets(token, params, pageParam),
    }),
    queryClient.prefetchQuery({ ...staffQueries.assignable(), queryFn: () => loadAssignableStaff(token) }),
  ]);

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Customer care"
        title="Support"
        description="Customer tickets, most recent activity first. Waiting time turns amber at half the response target for the priority and red once it is overdue."
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TicketFiltersForm filters={filters} />
        <TicketQueue
          key={ticketFiltersPath(filters)}
          params={params}
          filtered={hasTicketFilters(filters)}
          renderedAt={new Date().getTime()}
        />
      </HydrationBoundary>
    </div>
  );
}
