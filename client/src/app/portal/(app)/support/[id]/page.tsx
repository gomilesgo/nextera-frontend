import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { TicketDetailView } from "@/components/support/TicketDetailView";
import { ticketQuery } from "@/lib/queries/support";
import { loadTicket } from "@/lib/queries/supportLoaders";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";
import { isTicketId } from "@/lib/support/validation";

export const metadata: Metadata = { title: "Support request" };

export default async function SupportRequestPage({ params }: PageProps<"/portal/support/[id]">) {
  const { token } = await requireCustomer();
  const { id } = await params;
  if (!isTicketId(id)) notFound();

  const data = await loadTicket(token, id);
  if (!data) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(ticketQuery(id).queryKey, data);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="mx-auto w-full max-w-4xl">
        <TicketDetailView id={id} />
      </div>
    </HydrationBoundary>
  );
}
