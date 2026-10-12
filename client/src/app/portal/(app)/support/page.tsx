import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { SupportListView } from "@/components/support/SupportListView";
import { ticketsQuery } from "@/lib/queries/support";
import { loadTickets } from "@/lib/queries/supportLoaders";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";
import { parseStatusFilter } from "@/lib/support/requests";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage({ searchParams }: PageProps<"/portal/support">) {
  const { token } = await requireCustomer();
  const query = await searchParams;
  const status = parseStatusFilter(Array.isArray(query.status) ? query.status[0] : query.status);

  const queryClient = getServerQueryClient();
  await queryClient.fetchInfiniteQuery(ticketsQuery(status, (cursor) => loadTickets(token, status, cursor)));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SupportListView status={status} />
    </HydrationBoundary>
  );
}
