import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { TicketDetail } from "@/components/support/TicketDetail";
import { can } from "@/lib/permissions";
import { staffQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { supportQueries } from "@/lib/queries/support";
import { requirePermission } from "@/lib/session";
import { isUuid } from "@/lib/shape";
import { loadTicket } from "@/lib/support/api";
import { loadStaffList } from "@/lib/team/api";

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketPage({ params }: PageProps<"/support/[id]">) {
  const { id } = await params;
  const { staff, token } = await requirePermission("support.view");
  if (!isUuid(id)) notFound();
  const detail = await loadTicket(token, id);
  if (!detail) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(supportQueries.detail(id).queryKey, detail);
  if (can(staff.role, "staff.manage")) {
    await queryClient.prefetchQuery({ ...staffQueries.list(), queryFn: () => loadStaffList(token) });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TicketDetail ticketId={id} canWrite={can(staff.role, "support.write")} renderedAt={new Date().getTime()} />
    </HydrationBoundary>
  );
}
