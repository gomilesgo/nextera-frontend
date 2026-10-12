import { describe, expect, it } from "vitest";
import { TOO_LARGE, defaultAmountPaise, formatRupeesInput, parseRupeesInput, quote } from "./calculator";

const plan = {
  name: "Steady 12",
  rateBps: 800,
  tenureMonths: 12,
  minPaise: 1_000_000,
  maxPaise: 500_000_000,
};

describe("parseRupeesInput", () => {
  it("reads Indian-grouped rupee amounts into paise", () => {
    expect(parseRupeesInput("13,50,000")).toBe(135_000_000);
    expect(parseRupeesInput("₹ 1,00,000.50")).toBe(10_000_050);
    expect(parseRupeesInput("2500")).toBe(250_000);
  });

  it("reports amounts beyond safe precision as too large rather than invalid", () => {
    expect(parseRupeesInput("99999999999999999999")).toBe(TOO_LARGE);
    expect(quote({ plan, amountPaise: parseRupeesInput("99999999999999999999"), startDate: "2026-10-12" })).toEqual({
      ok: false,
      message: "The maximum for Steady 12 is ₹50,00,000.",
    });
  });

  it("rejects empty, negative, zero and over-precise input", () => {
    for (const text of ["", "abc", "-100", "0", "10.555", "1e5"]) {
      expect(parseRupeesInput(text)).toBeNull();
    }
  });
});

describe("formatRupeesInput", () => {
  it("groups digits the Indian way", () => {
    expect(formatRupeesInput(135_000_000)).toBe("13,50,000");
    expect(formatRupeesInput(10_000_050)).toBe("1,00,000.5");
  });
});

describe("defaultAmountPaise", () => {
  it("starts at one lakh, clamped into the plan range", () => {
    expect(defaultAmountPaise(plan)).toBe(10_000_000);
    expect(defaultAmountPaise({ minPaise: 50_000_000, maxPaise: 90_000_000 })).toBe(50_000_000);
    expect(defaultAmountPaise({ minPaise: 100_000, maxPaise: 5_000_000 })).toBe(5_000_000);
  });
});

describe("quote", () => {
  it("pays ₹9,000 a month on ₹13,50,000 at 8%", () => {
    const result = quote({ plan, amountPaise: 135_000_000, startDate: "2026-10-12" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary).toEqual({
      monthlyPaise: 900_000,
      totalReturnPaise: 10_800_000,
      maturityValuePaise: 145_800_000,
      maturityDate: "2027-10-12",
    });
    expect(result.schedule).toHaveLength(12);
    expect(result.schedule[0]).toEqual({
      periodNo: 1,
      dueDate: "2026-11-12",
      grossPaise: 900_000,
      cumulativePaise: 900_000,
    });
    expect(result.points).toHaveLength(13);
    expect(result.points[0]).toEqual({ month: 0, date: "2026-10-12", valuePaise: 135_000_000, returnsPaise: 0 });
    expect(result.points[12]?.valuePaise).toBe(145_800_000);
  });

  it("explains missing or out-of-range amounts", () => {
    expect(quote({ plan, amountPaise: null, startDate: "2026-10-12" })).toEqual({
      ok: false,
      message: "Enter an amount in rupees, for example 1,00,000.",
    });
    expect(quote({ plan, amountPaise: 999_900, startDate: "2026-10-12" })).toEqual({
      ok: false,
      message: "The minimum for Steady 12 is ₹10,000.",
    });
    expect(quote({ plan, amountPaise: 500_000_100, startDate: "2026-10-12" })).toEqual({
      ok: false,
      message: "The maximum for Steady 12 is ₹50,00,000.",
    });
  });
});
