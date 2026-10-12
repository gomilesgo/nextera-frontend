import { planStatuses } from "@nextera/contracts";
import type { Plan } from "@nextera/contracts";

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

export function toPlan(raw: unknown): Plan | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.slug !== "string" ||
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    !isInteger(value.rateBps) ||
    !isInteger(value.tenureMonths) ||
    !isInteger(value.minPaise) ||
    !isInteger(value.maxPaise) ||
    typeof value.status !== "string" ||
    !(planStatuses as readonly string[]).includes(value.status) ||
    value.rateBps <= 0 ||
    value.tenureMonths < 1 ||
    value.minPaise <= 0 ||
    value.maxPaise < value.minPaise
  ) {
    return null;
  }
  return {
    id: value.id,
    slug: value.slug,
    name: value.name,
    description: value.description,
    rateBps: value.rateBps,
    tenureMonths: value.tenureMonths,
    minPaise: value.minPaise,
    maxPaise: value.maxPaise,
    status: value.status as Plan["status"],
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
  };
}

export function toActivePlans(raw: unknown): Plan[] {
  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { plans?: unknown }).plans)
      ? (raw as { plans: unknown[] }).plans
      : [];
  return list.map(toPlan).filter((plan): plan is Plan => plan !== null && plan.status === "active");
}

export function formatTenure(months: number): string {
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? "year" : "years"}`;
  }
  return `${months} ${months === 1 ? "month" : "months"}`;
}

export const illustrativePlan: Plan = {
  id: "illustrative",
  slug: "illustrative",
  name: "Illustrative plan",
  description: "An example at 8% a year over 12 months, used while live plans are unavailable.",
  rateBps: 800,
  tenureMonths: 12,
  minPaise: 1_000_000,
  maxPaise: 10_000_000_000,
  status: "active",
  createdAt: "",
  updatedAt: "",
};
