import { useMutation, useQueryClient } from "@tanstack/react-query";
import { closeTicket, replyToTicket, updateTicket } from "@/app/(console)/support/actions";
import { isNavigationError, runAction } from "@/lib/actions/navigation";
import { unwrapOutcome } from "@/lib/actions/outcome";
import type { TicketPatchInput } from "./reply";
import { syncReply, syncTicket } from "./cache";

export function useReplyToTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => unwrapOutcome(await runAction(() => replyToTicket(ticketId, formData))),
    onSuccess: (result) => syncReply(queryClient, result),
    throwOnError: isNavigationError,
  });
}

export function useUpdateTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TicketPatchInput) => unwrapOutcome(await runAction(() => updateTicket(ticketId, patch))),
    onSuccess: (ticket) => syncTicket(queryClient, ticket),
    throwOnError: isNavigationError,
  });
}

export function useCloseTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrapOutcome(await runAction(() => closeTicket(ticketId))),
    onSuccess: (ticket) => syncTicket(queryClient, ticket),
    throwOnError: isNavigationError,
  });
}
