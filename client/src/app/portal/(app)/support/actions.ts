"use server";

import type { TicketDetailResponse, TicketMessageResponse, TicketResponse } from "@nextera/contracts";
import { callBackend } from "@/lib/backend/server";
import { clearSession, readSessionToken } from "@/lib/session";
import { closeTicket, createTicket, replyToTicket } from "@/lib/support/mutations";
import type { MutationDeps, SupportResult } from "@/lib/support/mutations";

async function deps(): Promise<MutationDeps> {
  return { token: await readSessionToken(), call: callBackend, clearSession };
}

export async function createTicketAction(formData: FormData): Promise<SupportResult<TicketDetailResponse>> {
  if (!(formData instanceof FormData)) return { ok: false, status: 400, code: "validation", message: "Send the form again." };
  return createTicket(await deps(), formData);
}

export async function replyTicketAction(ticketId: string, formData: FormData): Promise<SupportResult<TicketMessageResponse>> {
  if (!(formData instanceof FormData)) return { ok: false, status: 400, code: "validation", message: "Send the form again." };
  return replyToTicket(await deps(), ticketId, formData);
}

export async function closeTicketAction(ticketId: string): Promise<SupportResult<TicketResponse>> {
  return closeTicket(await deps(), ticketId);
}
