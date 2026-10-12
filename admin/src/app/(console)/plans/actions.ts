"use server";

import type { Plan, PlanStatus } from "@nextera/contracts";
import type { BackendError } from "@/lib/backend/client";
import { buildPlanInput, buildPlanUpdate, mapApiFields, readPlanForm } from "@/lib/plans/form";
import type { PlanFormErrors } from "@/lib/plans/form";
import { isPlan, isPlanId } from "@/lib/plans/shape";
import { CHECK_FIELDS } from "@/lib/actions/outcome";
import { authorizeAction, staffRequest } from "@/lib/session";

export type PlanMutationResult =
  | { status: "ok"; plan: Plan }
  | { status: "error"; message: string; errors?: PlanFormErrors };

export type PlanDeleteResult = { status: "ok" } | { status: "error"; message: string };

function failure(error: BackendError): PlanMutationResult {
  const errors = mapApiFields(error.fields);
  if (error.code === "conflict" && /slug/i.test(error.message)) {
    (errors.slug ??= []).push(error.message);
  }
  return {
    status: "error",
    message: error.code === "validation" ? CHECK_FIELDS : error.message,
    errors,
  };
}

function planFrom(data: { plan: unknown } | undefined): PlanMutationResult {
  if (!data || !isPlan(data.plan)) {
    return { status: "error", message: "The server returned an unexpected plan" };
  }
  return { status: "ok", plan: data.plan };
}

export async function createPlan(formData: FormData): Promise<PlanMutationResult> {
  const auth = await authorizeAction("plans.write");
  if (!auth.ok) return { status: "error", message: auth.message };

  const built = buildPlanInput(readPlanForm(formData));
  if (!built.ok) return { status: "error", message: CHECK_FIELDS, errors: built.errors };

  const result = await staffRequest<{ plan: unknown }>(auth.token, "/v1/admin/plans", {
    method: "POST",
    json: built.payload,
  });
  return result.ok ? planFrom(result.data) : failure(result.error);
}

export async function updatePlan(id: string, formData: FormData): Promise<PlanMutationResult> {
  const auth = await authorizeAction("plans.write");
  if (!auth.ok) return { status: "error", message: auth.message };
  if (!isPlanId(id)) return { status: "error", message: "Plan not found" };

  const built = buildPlanUpdate(readPlanForm(formData), { includeSlug: formData.has("slug") });
  if (!built.ok) return { status: "error", message: CHECK_FIELDS, errors: built.errors };

  const result = await staffRequest<{ plan: unknown }>(auth.token, `/v1/admin/plans/${id}`, {
    method: "PATCH",
    json: built.payload,
  });
  return result.ok ? planFrom(result.data) : failure(result.error);
}

export async function changePlanStatus(
  id: string,
  status: Exclude<PlanStatus, "draft">,
): Promise<PlanMutationResult> {
  const auth = await authorizeAction("plans.write");
  if (!auth.ok) return { status: "error", message: auth.message };
  if (!isPlanId(id)) return { status: "error", message: "Plan not found" };
  if (status !== "active" && status !== "archived") {
    return { status: "error", message: "Unsupported status" };
  }

  const result = await staffRequest<{ plan: unknown }>(auth.token, `/v1/admin/plans/${id}`, {
    method: "PATCH",
    json: { status },
  });
  return result.ok ? planFrom(result.data) : failure(result.error);
}

export async function deletePlan(id: string): Promise<PlanDeleteResult> {
  const auth = await authorizeAction("plans.write");
  if (!auth.ok) return { status: "error", message: auth.message };
  if (!isPlanId(id)) return { status: "error", message: "Plan not found" };

  const result = await staffRequest(auth.token, `/v1/admin/plans/${id}`, { method: "DELETE" });
  return result.ok ? { status: "ok" } : { status: "error", message: result.error.message };
}
