import { describe, expect, it } from "vitest";
import { isPlan, isPlanId } from "./shape";

const plan = {
  id: "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11",
  slug: "gold",
  name: "Gold",
  description: "",
  rateBps: 1200,
  tenureMonths: 12,
  minPaise: 100,
  maxPaise: 1000,
  status: "active",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("isPlanId", () => {
  it("accepts UUIDs only", () => {
    expect(isPlanId(plan.id)).toBe(true);
    expect(isPlanId("../admin/staff")).toBe(false);
    expect(isPlanId("")).toBe(false);
  });
});

describe("isPlan", () => {
  it("accepts the contracts plan shape", () => {
    expect(isPlan(plan)).toBe(true);
  });

  it("rejects missing fields, fractional money and unknown statuses", () => {
    expect(isPlan({ ...plan, name: undefined })).toBe(false);
    expect(isPlan({ ...plan, minPaise: 1.5 })).toBe(false);
    expect(isPlan({ ...plan, status: "paused" })).toBe(false);
    expect(isPlan(null)).toBe(false);
  });
});
