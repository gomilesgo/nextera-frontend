import "server-only";
import type { AdminLeadListResponse, AdminLeadResponse } from "@nextera/contracts";
import type { BackendResult } from "@/lib/backend/client";
import { notFound, readBackend, unwrapForPage } from "@/lib/backend/read";
import { leadListSearch } from "@/lib/queries/leads";
import { isUuid } from "@/lib/shape";
import type { LeadListParams } from "./filters";
import { isAdminLeadList, isAdminLeadResponse } from "./shape";

export function fetchLeads(
  token: string,
  params: LeadListParams,
  cursor: string | null,
  limit?: number,
): Promise<BackendResult<AdminLeadListResponse>> {
  const search = new URLSearchParams(leadListSearch(params, cursor));
  if (limit !== undefined) search.set("limit", String(limit));
  return readBackend(token, `/v1/admin/leads?${search.toString()}`, (data) => (isAdminLeadList(data) ? data : null), "lead list");
}

export async function fetchLead(token: string, id: string): Promise<BackendResult<AdminLeadResponse>> {
  if (!isUuid(id)) return notFound("Lead not found");
  return readBackend(token, `/v1/admin/leads/${id}`, (data) => (isAdminLeadResponse(data) ? { lead: data.lead } : null), "lead");
}

export async function loadLeads(token: string, params: LeadListParams, cursor: string | null): Promise<AdminLeadListResponse> {
  return unwrapForPage(await fetchLeads(token, params, cursor)) ?? { items: [], nextCursor: null };
}

export async function loadLead(token: string, id: string): Promise<AdminLeadResponse | null> {
  return unwrapForPage(await fetchLead(token, id));
}
