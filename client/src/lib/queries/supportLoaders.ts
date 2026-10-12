import "server-only";
import type { TicketDetailResponse, TicketListResponse, TicketStatus } from "@nextera/contracts";
import { callBackend } from "@/lib/backend/server";
import { logBackendError } from "@/lib/safeErrors";
import { toTicketDetail, toTicketList } from "@/lib/support/parse";
import { ticketListPath, ticketPath } from "@/lib/support/requests";
import { isTicketId } from "@/lib/support/validation";
import { expireOnUnauthorized } from "./loaders";

export async function loadTickets(token: string, status: TicketStatus | null, cursor: string | null): Promise<TicketListResponse> {
  const result = await callBackend<unknown>(ticketListPath(status, cursor), { token });
  await expireOnUnauthorized(result, "loader.support.list");
  if (!result.ok) {
    logBackendError("support:list", result.error, result.status);
    throw new Error("Support requests are unavailable");
  }
  const list = toTicketList(result.data);
  if (!list) throw new Error("Support requests returned an unexpected shape");
  return list;
}

export async function loadTicket(token: string, id: string): Promise<TicketDetailResponse | null> {
  if (!isTicketId(id)) return null;
  const result = await callBackend<unknown>(ticketPath(id), { token });
  await expireOnUnauthorized(result, "loader.support.detail");
  if (!result.ok) {
    if (result.error.code === "not_found" || result.error.code === "validation") return null;
    logBackendError("support:detail", result.error, result.status);
    throw new Error("Support request is unavailable");
  }
  const detail = toTicketDetail(result.data);
  if (!detail) throw new Error("Support request returned an unexpected shape");
  return detail;
}
