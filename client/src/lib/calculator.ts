import { calculateReturns, formatPaise, projectSchedule, rupeesToPaise } from "@nextera/contracts";
import type { Plan, ReturnsSummary, SchedulePeriod } from "@nextera/contracts";

export type GrowthPoint = {
  month: number;
  date: string;
  valuePaise: number;
  returnsPaise: number;
};

export type Quote =
  | {
      ok: true;
      principalPaise: number;
      summary: ReturnsSummary;
      schedule: SchedulePeriod[];
      points: GrowthPoint[];
    }
  | { ok: false; message: string };

const RUPEE_INPUT = /^\d+(?:\.\d{1,2})?$/;
const DEFAULT_AMOUNT_PAISE = 10_000_000;

const inputFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export const TOO_LARGE = "too_large" as const;

export type RupeesInput = number | null | typeof TOO_LARGE;

export function parseRupeesInput(text: string): RupeesInput {
  const compact = text.replace(/[₹,\s]/g, "");
  if (!RUPEE_INPUT.test(compact)) return null;
  const rupees = Number(compact);
  if (!Number.isFinite(rupees) || rupees * 100 > Number.MAX_SAFE_INTEGER) return TOO_LARGE;
  const paise = rupeesToPaise(rupees);
  return paise > 0 ? paise : null;
}

export function amountOrUndefined(value: RupeesInput): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function formatRupeesInput(paise: number): string {
  return inputFormatter.format(paise / 100);
}

export function defaultAmountPaise(plan: Pick<Plan, "minPaise" | "maxPaise">): number {
  return Math.min(Math.max(DEFAULT_AMOUNT_PAISE, plan.minPaise), plan.maxPaise);
}

export function quote(input: {
  plan: Pick<Plan, "name" | "rateBps" | "tenureMonths" | "minPaise" | "maxPaise">;
  amountPaise: RupeesInput;
  startDate: string;
}): Quote {
  const { plan, amountPaise, startDate } = input;
  if (amountPaise === null) return { ok: false, message: "Enter an amount in rupees, for example 1,00,000." };
  if (amountPaise === TOO_LARGE || amountPaise > plan.maxPaise) {
    return { ok: false, message: `The maximum for ${plan.name} is ${formatPaise(plan.maxPaise)}.` };
  }
  if (amountPaise < plan.minPaise) {
    return { ok: false, message: `The minimum for ${plan.name} is ${formatPaise(plan.minPaise)}.` };
  }
  const schedule = projectSchedule({
    principalPaise: amountPaise,
    rateBps: plan.rateBps,
    tenureMonths: plan.tenureMonths,
    startDate,
  });
  const summary = calculateReturns({
    principalPaise: amountPaise,
    rateBps: plan.rateBps,
    tenureMonths: plan.tenureMonths,
    startDate,
  });
  const points: GrowthPoint[] = [
    { month: 0, date: startDate, valuePaise: amountPaise, returnsPaise: 0 },
    ...schedule.map((period) => ({
      month: period.periodNo,
      date: period.dueDate,
      valuePaise: amountPaise + period.cumulativePaise,
      returnsPaise: period.cumulativePaise,
    })),
  ];
  return { ok: true, principalPaise: amountPaise, summary, schedule, points };
}
