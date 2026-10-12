import { describe, expect, it } from "vitest";
import {
  addMonthsClamped,
  calculateReturns,
  monthlyReturnPaise,
  parseIsoDate,
  projectSchedule,
} from "./schedule";

describe("monthlyReturnPaise", () => {
  it("matches the agreed example of 13.5 lakh at 8% p.a.", () => {
    expect(monthlyReturnPaise(135000000, 800)).toBe(900000);
  });

  it("floors fractional paise", () => {
    expect(monthlyReturnPaise(100001, 800)).toBe(666);
  });

  it("stays exact beyond the float-safe product range", () => {
    expect(monthlyReturnPaise(1_000_000_000_000, 1200)).toBe(10_000_000_000);
  });
});

describe("addMonthsClamped", () => {
  it("adds months on the same day", () => {
    expect(addMonthsClamped("2026-10-10", 1)).toBe("2026-11-10");
    expect(addMonthsClamped("2026-10-10", 3)).toBe("2027-01-10");
  });

  it("clamps to the last day of shorter months", () => {
    expect(addMonthsClamped("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsClamped("2027-01-31", 2)).toBe("2027-03-31");
    expect(addMonthsClamped("2026-08-31", 1)).toBe("2026-09-30");
  });
});

describe("parseIsoDate", () => {
  it("rejects malformed and impossible dates", () => {
    expect(() => parseIsoDate("2026-13-01")).toThrow(RangeError);
    expect(() => parseIsoDate("2027-02-29")).toThrow(RangeError);
    expect(() => parseIsoDate("10/10/2026")).toThrow(RangeError);
  });
});

describe("projectSchedule", () => {
  it("credits the same amount every month and accumulates it", () => {
    const schedule = projectSchedule({
      principalPaise: 135000000,
      rateBps: 800,
      tenureMonths: 12,
      startDate: "2026-10-10",
    });
    expect(schedule).toHaveLength(12);
    expect(schedule[0]).toEqual({
      periodNo: 1,
      dueDate: "2026-11-10",
      grossPaise: 900000,
      cumulativePaise: 900000,
    });
    expect(schedule[1]).toEqual({
      periodNo: 2,
      dueDate: "2026-12-10",
      grossPaise: 900000,
      cumulativePaise: 1800000,
    });
    expect(schedule[11]?.dueDate).toBe("2027-10-10");
    expect(schedule[11]?.cumulativePaise).toBe(10800000);
  });

  it("anchors every period to the original start day", () => {
    const dates = projectSchedule({
      principalPaise: 1000000,
      rateBps: 900,
      tenureMonths: 3,
      startDate: "2027-01-31",
    }).map((period) => period.dueDate);
    expect(dates).toEqual(["2027-02-28", "2027-03-31", "2027-04-30"]);
  });

  it("rejects invalid input", () => {
    const base = { principalPaise: 100000, rateBps: 800, tenureMonths: 12, startDate: "2026-10-10" };
    expect(() => projectSchedule({ ...base, principalPaise: 0 })).toThrow(RangeError);
    expect(() => projectSchedule({ ...base, principalPaise: 10.5 })).toThrow(RangeError);
    expect(() => projectSchedule({ ...base, rateBps: -1 })).toThrow(RangeError);
    expect(() => projectSchedule({ ...base, tenureMonths: 0 })).toThrow(RangeError);
    expect(() => projectSchedule({ ...base, startDate: "2026-02-30" })).toThrow(RangeError);
  });
});

describe("calculateReturns", () => {
  it("summarises monthly, total and maturity value", () => {
    expect(
      calculateReturns({
        principalPaise: 135000000,
        rateBps: 800,
        tenureMonths: 12,
        startDate: "2026-10-10",
      }),
    ).toEqual({
      monthlyPaise: 900000,
      totalReturnPaise: 10800000,
      maturityValuePaise: 145800000,
      maturityDate: "2027-10-10",
    });
  });
});
