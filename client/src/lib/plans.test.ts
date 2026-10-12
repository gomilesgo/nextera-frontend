import { describe, expect, it } from "vitest";
import { formatTenure, toActivePlans, toPlan } from "./plans";

const plan = {
  id: "p1",
  slug: "steady-12",
  name: "Steady 12",
  description: "Twelve months at a fixed rate",
  rateBps: 800,
  tenureMonths: 12,
  minPaise: 1_000_000,
  maxPaise: 500_000_000,
  status: "active",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("toPlan", () => {
  it("accepts a well-formed plan", () => {
    expect(toPlan(plan)).toEqual(plan);
  });

  it("rejects plans the calculator cannot use", () => {
    expect(toPlan({ ...plan, rateBps: 0 })).toBeNull();
    expect(toPlan({ ...plan, tenureMonths: 1.5 })).toBeNull();
    expect(toPlan({ ...plan, maxPaise: 10 })).toBeNull();
    expect(toPlan({ ...plan, status: "paused" })).toBeNull();
    expect(toPlan("plan")).toBeNull();
  });
});

describe("toActivePlans", () => {
  it("keeps valid active plans and drops the rest", () => {
    expect(
      toActivePlans({ plans: [plan, { ...plan, id: "p2", status: "archived" }, { nope: true }] }).map((p) => p.id),
    ).toEqual(["p1"]);
    expect(toActivePlans(undefined)).toEqual([]);
    expect(toActivePlans({ plans: "x" })).toEqual([]);
  });
});

describe("formatTenure", () => {
  it("prefers years when the tenure divides evenly", () => {
    expect(formatTenure(12)).toBe("1 year");
    expect(formatTenure(36)).toBe("3 years");
    expect(formatTenure(18)).toBe("18 months");
    expect(formatTenure(1)).toBe("1 month");
  });
});
