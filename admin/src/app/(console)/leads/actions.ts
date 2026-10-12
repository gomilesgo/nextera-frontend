"use server";

import type { AdminLead, LeadConvertResponse } from "@nextera/contracts";
import type { ActionOutcome } from "@/lib/actions/outcome";
import { CHECK_FIELDS, backendFailure, unexpectedResponse } from "@/lib/actions/server";
import { buildLeadCreate, buildLeadUpdate, leadApiFieldMap, readLeadForm } from "@/lib/leads/form";
import type { LeadPatchInput } from "@/lib/leads/form";
import { isAdminLeadResponse, isLeadConvertResponse } from "@/lib/leads/shape";
import { authorizeAction, staffRequest } from "@/lib/session";
import { isRecord, isUuid } from "@/lib/shape";

export type LeadResult = ActionOutcome<AdminLead>;
export type LeadConvertResult = ActionOutcome<LeadConvertResponse>;

const missing = { status: "error", code: "not_found", message: "Lead not found" } as const;

export async function createLead(formData: FormData): Promise<LeadResult> {
  const auth = await authorizeAction("leads.write");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };
  if (!(formData instanceof FormData)) return { status: "error", code: "validation", message: CHECK_FIELDS };

  const built = buildLeadCreate(readLeadForm(formData));
  if (!built.ok) return { status: "error", code: "validation", message: CHECK_FIELDS, errors: built.errors };

  const result = await staffRequest<unknown>(auth.token, "/v1/admin/leads", { method: "POST", json: built.payload });
  if (!result.ok) return backendFailure(result.error, leadApiFieldMap);
  return isAdminLeadResponse(result.data) ? { status: "ok", data: result.data.lead } : unexpectedResponse("lead");
}

export async function updateLead(id: string, patch: LeadPatchInput): Promise<LeadResult> {
  const auth = await authorizeAction("leads.write");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };
  if (!isUuid(id)) return missing;
  if (!isRecord(patch)) return { status: "error", code: "validation", message: CHECK_FIELDS };

  const built = buildLeadUpdate({ status: patch.status, notes: patch.notes, assigneeId: patch.assigneeId });
  if (!built.ok) return { status: "error", code: "validation", message: CHECK_FIELDS, errors: built.errors };

  const result = await staffRequest<unknown>(auth.token, `/v1/admin/leads/${id}`, { method: "PATCH", json: built.payload });
  if (!result.ok) return backendFailure(result.error);
  return isAdminLeadResponse(result.data) ? { status: "ok", data: result.data.lead } : unexpectedResponse("lead");
}

export async function convertLead(id: string): Promise<LeadConvertResult> {
  const auth = await authorizeAction("leads.write");
  if (!auth.ok) return { status: "error", code: "forbidden", message: auth.message };
  if (!isUuid(id)) return missing;

  const result = await staffRequest<unknown>(auth.token, `/v1/admin/leads/${id}/convert`, { method: "POST" });
  if (!result.ok) return backendFailure(result.error);
  return isLeadConvertResponse(result.data) ? { status: "ok", data: result.data } : unexpectedResponse("conversion result");
}
