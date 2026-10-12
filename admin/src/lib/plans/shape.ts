import { planStatuses } from "@nextera/contracts";
import type { Plan } from "@nextera/contracts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPlanId(value: string): boolean {
  return uuidPattern.test(value);
}

export function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Record<string, unknown>;
  return (
    typeof plan.id === "string" &&
    typeof plan.slug === "string" &&
    typeof plan.name === "string" &&
    typeof plan.description === "string" &&
    Number.isInteger(plan.rateBps) &&
    Number.isInteger(plan.tenureMonths) &&
    Number.isInteger(plan.minPaise) &&
    Number.isInteger(plan.maxPaise) &&
    typeof plan.status === "string" &&
    (planStatuses as readonly string[]).includes(plan.status) &&
    typeof plan.createdAt === "string" &&
    typeof plan.updatedAt === "string"
  );
}
