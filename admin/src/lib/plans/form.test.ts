import { describe, expect, it } from "vitest";
import type { Plan } from "@nextera/contracts";
import {
  buildPlanInput,
  buildPlanUpdate,
  emptyPlanValues,
  mapApiFields,
  parseDecimal,
  planToValues,
  readPlanForm,
  wholeDigits,
} from "./form";
import type { PlanFormValues } from "./form";

const valid: PlanFormValues = {
  slug: "gold-12",
  name: "Gold 12",
  description: "Twelve month plan",
  rate: "12.5",
  tenureMonths: "12",
  min: "10,000",
  max: "5,00,000.50",
  status: "active",
};

describe("parseDecimal", () => {
  it("accepts grouped rupees and up to two decimals", () => {
    expect(parseDecimal("1,00,000")).toBe(100000);
    expect(parseDecimal(" ₹ 99.5 ")).toBe(99.5);
    expect(parseDecimal("12.25%")).toBe(12.25);
  });

  it("rejects negatives, extra decimals and text", () => {
    expect(parseDecimal("-1")).toBeNull();
    expect(parseDecimal("1.234")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("")).toBeNull();
  });
});

describe("readPlanForm", () => {
  it("reads every field with defaults", () => {
    const data = new FormData();
    data.set("name", "Gold");
    expect(readPlanForm(data)).toEqual({ ...emptyPlanValues, name: "Gold" });
  });
});

describe("buildPlanInput", () => {
  it("converts rupees to paise and percent to basis points", () => {
    expect(buildPlanInput(valid)).toEqual({
      ok: true,
      payload: {
        slug: "gold-12",
        name: "Gold 12",
        description: "Twelve month plan",
        status: "active",
        rateBps: 1250,
        tenureMonths: 12,
        minPaise: 1_000_000,
        maxPaise: 50_000_050,
      },
    });
  });

  it("reports unparseable numbers against the form fields", () => {
    const result = buildPlanInput({ ...valid, rate: "lots", tenureMonths: "1.5", min: "", max: "x" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["max", "min", "rate", "tenureMonths"]);
  });

  it("checks rate bounds and min against max", () => {
    const result = buildPlanInput({ ...valid, rate: "40", min: "1000", max: "999" });
    expect(result).toEqual({
      ok: false,
      errors: {
        rate: ["Rate must be above 0% and at most 36%"],
        max: ["Maximum must be at least the minimum"],
      },
    });
  });

  it("returns a field error instead of throwing for huge amounts", () => {
    const huge = "9".repeat(400);
    expect(() => buildPlanInput({ ...valid, max: huge })).not.toThrow();
    expect(buildPlanInput({ ...valid, max: huge })).toEqual({
      ok: false,
      errors: { max: ["Amount is too large"] },
    });
    expect(buildPlanInput({ ...valid, min: "99999999999999", max: "99999999999999" })).toMatchObject({
      ok: false,
      errors: { min: ["Amount is too large"], max: ["Amount is too large"] },
    });
    expect(buildPlanInput({ ...valid, max: "9999999999999" }).ok).toBe(true);
    expect(buildPlanUpdate({ ...valid, min: huge }, { includeSlug: false })).toEqual({
      ok: false,
      errors: { min: ["Amount is too large"] },
    });
  });

  it("maps contract schema issues back to form fields", () => {
    const result = buildPlanInput({ ...valid, slug: "Bad Slug", min: "0.5" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.slug).toEqual(["Use lowercase letters, numbers and single hyphens"]);
    expect(result.errors.min).toEqual(["Minimum must be at least ₹1"]);
  });
});

describe("buildPlanUpdate", () => {
  it("omits the slug unless the plan is a draft", () => {
    const locked = buildPlanUpdate(valid, { includeSlug: false });
    expect(locked.ok && "slug" in locked.payload).toBe(false);
    const draft = buildPlanUpdate(valid, { includeSlug: true });
    expect(draft.ok && draft.payload.slug).toBe("gold-12");
    expect(draft.ok && "status" in draft.payload).toBe(false);
  });
});

describe("mapApiFields", () => {
  it("renames backend money and rate fields and collects unknown keys", () => {
    expect(
      mapApiFields({ maxPaise: ["Too small"], rateBps: ["Bad"], slug: ["Taken"], other: ["?"] }),
    ).toEqual({ max: ["Too small"], rate: ["Bad"], slug: ["Taken"], _: ["?"] });
  });
});

describe("planToValues", () => {
  it("round-trips through the form", () => {
    const plan: Plan = {
      id: "6f1c1e8e-3c2b-4a4e-9a51-0d6f6c1f0a11",
      slug: "silver",
      name: "Silver",
      description: "",
      rateBps: 1050,
      tenureMonths: 24,
      minPaise: 2_500_050,
      maxPaise: 100_000_000,
      status: "draft",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };
    const values = planToValues(plan);
    expect(values).toMatchObject({ rate: "10.5", min: "25000.5", max: "1000000", tenureMonths: "24" });
    const rebuilt = buildPlanUpdate(values, { includeSlug: true });
    expect(rebuilt.ok && rebuilt.payload).toMatchObject({
      rateBps: 1050,
      minPaise: 2_500_050,
      maxPaise: 100_000_000,
    });
  });
});

describe("wholeDigits", () => {
  it("counts whole rupee digits ignoring separators, symbols and leading zeros", () => {
    expect(wholeDigits("₹1,50,000.50")).toBe(6);
    expect(wholeDigits("000123")).toBe(3);
    expect(wholeDigits("0.5")).toBe(1);
    expect(wholeDigits(" 12 % ")).toBe(2);
  });
});
