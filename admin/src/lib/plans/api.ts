import "server-only";
import { redirect } from "next/navigation";
import type { Plan } from "@nextera/contracts";
import { PASSWORD_CHANGE_REQUIRED } from "@/lib/backend/client";
import type { BackendResult } from "@/lib/backend/client";
import { callBackend } from "@/lib/backend/server";
import type { PlanResponse, PlansResponse } from "@/lib/queries/options";
import { EXPIRED_PATH, PASSWORD_PATH } from "@/lib/sessionCookie";
import { isPlan, isPlanId } from "./shape";

export { isPlanId };

function unexpected(): BackendResult<never> {
  return {
    ok: false,
    status: 502,
    error: { code: "internal", message: "The server returned an unexpected plan list" },
  };
}

export async function fetchPlans(token: string): Promise<BackendResult<PlansResponse>> {
  const result = await callBackend<{ plans: unknown }>("/v1/admin/plans", { token });
  if (!result.ok) return result;
  const plans = result.data?.plans;
  if (!Array.isArray(plans) || !plans.every(isPlan)) return unexpected();
  return { ok: true, status: result.status, data: { plans: plans as Plan[] } };
}

export async function fetchPlan(token: string, id: string): Promise<BackendResult<PlanResponse>> {
  const missing: BackendResult<never> = {
    ok: false,
    status: 404,
    error: { code: "not_found", message: "Plan not found" },
  };
  if (!isPlanId(id)) return missing;
  const result = await fetchPlans(token);
  if (!result.ok) return result;
  const plan = result.data.plans.find((candidate) => candidate.id === id);
  return plan ? { ok: true, status: 200, data: { plan } } : missing;
}

function unwrapForPage<T>(result: BackendResult<T>): T | null {
  if (result.ok) return result.data;
  if (result.error.code === "unauthorized") redirect(EXPIRED_PATH);
  if (result.error.code === PASSWORD_CHANGE_REQUIRED) redirect(PASSWORD_PATH);
  if (result.error.code === "not_found") return null;
  throw new Error(result.error.message);
}

export async function loadPlans(token: string): Promise<PlansResponse> {
  return unwrapForPage(await fetchPlans(token)) ?? { plans: [] };
}

export async function loadPlan(token: string, id: string): Promise<PlanResponse | null> {
  return unwrapForPage(await fetchPlan(token, id));
}
