import type { QueryClient } from "@tanstack/react-query";
import type { AdminTicketDetailResponse, AdminTicketMessageResponse, AdminTicketSummary } from "@nextera/contracts";
import { supportKeys } from "@/lib/queries/support";

async function refresh(queryClient: QueryClient, ticketId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: supportKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: supportKeys.detail(ticketId) }),
  ]);
}

export async function syncTicket(queryClient: QueryClient, ticket: AdminTicketSummary): Promise<void> {
  queryClient.setQueryData<AdminTicketDetailResponse>(supportKeys.detail(ticket.id), (current) =>
    current ? { ...current, ticket } : current,
  );
  await refresh(queryClient, ticket.id);
}

export async function syncReply(queryClient: QueryClient, result: AdminTicketMessageResponse): Promise<void> {
  queryClient.setQueryData<AdminTicketDetailResponse>(supportKeys.detail(result.ticket.id), (current) =>
    current
      ? {
          ...current,
          ticket: result.ticket,
          messages: current.messages.some((message) => message.id === result.message.id)
            ? current.messages
            : [...current.messages, result.message],
        }
      : current,
  );
  await refresh(queryClient, result.ticket.id);
}
