import "server-only";
import type { AdminTicketDetailResponse, AdminTicketListResponse } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { notFound, readBackend, unwrapForPage } from "@/lib/backend/read";
import { ticketListSearch } from "@/lib/queries/support";
import { isUuid } from "@/lib/shape";
import type { TicketListParams } from "./filters";
import { isAdminTicketDetail, isAdminTicketList } from "./shape";

export function fetchTickets(
  token: string,
  params: TicketListParams,
  cursor: string | null,
  limit?: number,
): Promise<BackendResult<AdminTicketListResponse>> {
  const search = new URLSearchParams(ticketListSearch(params, cursor));
  if (limit !== undefined) search.set("limit", String(limit));
  return readBackend(
    token,
    `/v1/admin/support/tickets?${search.toString()}`,
    (data) => (isAdminTicketList(data) ? data : null),
    "ticket list",
  );
}

export async function fetchTicket(token: string, id: string): Promise<BackendResult<AdminTicketDetailResponse>> {
  if (!isUuid(id)) return notFound("Ticket not found");
  return readBackend(token, `/v1/admin/support/tickets/${id}`, (data) => (isAdminTicketDetail(data) ? data : null), "ticket");
}

export async function loadTickets(
  token: string,
  params: TicketListParams,
  cursor: string | null,
): Promise<AdminTicketListResponse> {
  return unwrapForPage(await fetchTickets(token, params, cursor)) ?? { items: [], nextCursor: null };
}

export async function loadTicket(token: string, id: string): Promise<AdminTicketDetailResponse | null> {
  return unwrapForPage(await fetchTicket(token, id));
}
