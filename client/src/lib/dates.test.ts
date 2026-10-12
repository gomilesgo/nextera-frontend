import { describe, expect, it } from "vitest";
import { formatIsoDate, formatIsoMonth, formatTimestamp, todayInIndia } from "./dates";

describe("todayInIndia", () => {
  it("uses the Indian calendar day, not UTC", () => {
    expect(todayInIndia(new Date("2026-10-11T19:00:00Z"))).toBe("2026-10-12");
    expect(todayInIndia(new Date("2026-10-11T18:00:00Z"))).toBe("2026-10-11");
  });
});

describe("formatIsoDate", () => {
  it("formats calendar dates without shifting the day", () => {
    expect(formatIsoDate("2027-02-28")).toBe("28 Feb 2027");
    expect(formatIsoMonth("2027-02-28")).toBe("Feb 27");
  });
});

describe("formatTimestamp", () => {
  it("shows the Indian calendar day of an instant", () => {
    expect(formatTimestamp("2026-10-11T19:00:00.000Z")).toBe("12 Oct 2026");
    expect(formatTimestamp("not a date")).toBeNull();
  });
});
