import "server-only";
import type { Plan } from "@nextera/contracts";
import { toActivePlans, toPlan } from "@/lib/plans";
import { callBackend, callPublicBackend } from "./server";

export const PUBLIC_PLANS_REVALIDATE_SECONDS = 300;

export type PlansResult = { status: "ok"; plans: Plan[] } | { status: "unavailable" };

export type PlanResult = { status: "ok"; plan: Plan } | { status: "not_found" } | { status: "unavailable" };

export async function getPublicPlans(): Promise<PlansResult> {
  const result = await callPublicBackend<unknown>("/v1/plans", PUBLIC_PLANS_REVALIDATE_SECONDS);
  if (!result.ok) return { status: "unavailable" };
  return { status: "ok", plans: toActivePlans(result.data) };
}

export async function getPortalPlans(): Promise<PlansResult> {
  const result = await callBackend<unknown>("/v1/plans");
  if (!result.ok) return { status: "unavailable" };
  return { status: "ok", plans: toActivePlans(result.data) };
}

export async function getPortalPlan(slug: string): Promise<PlanResult> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return { status: "not_found" };
  const result = await callBackend<{ plan?: unknown }>(`/v1/plans/${encodeURIComponent(slug)}`);
  if (!result.ok) return result.error.code === "not_found" ? { status: "not_found" } : { status: "unavailable" };
  const plan = toPlan(result.data?.plan);
  if (!plan || plan.status !== "active") return { status: "not_found" };
  return { status: "ok", plan };
}
