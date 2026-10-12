import { describe, expect, it } from "vitest";
import { compactRupees, linearTicks, monthTickIndexes, niceCeiling } from "./chart";

describe("niceCeiling", () => {
  it("rounds up to a readable axis maximum", () => {
    expect(niceCeiling(10_800_000)).toBe(12_000_000);
    expect(niceCeiling(900_000)).toBe(1_000_000);
    expect(niceCeiling(0)).toBe(1);
  });
});

describe("linearTicks", () => {
  it("spaces ticks evenly from zero to the nice maximum", () => {
    expect(linearTicks(10_800_000)).toEqual([0, 3_000_000, 6_000_000, 9_000_000, 12_000_000]);
  });
});

describe("compactRupees", () => {
  it("uses Indian units", () => {
    expect(compactRupees(900_000)).toBe("₹9K");
    expect(compactRupees(10_800_000)).toBe("₹1.08 L");
    expect(compactRupees(2_500_000_000)).toBe("₹2.5 Cr");
    expect(compactRupees(50_000)).toBe("₹500");
  });
});

describe("monthTickIndexes", () => {
  it("always includes the first and last month without crowding", () => {
    expect(monthTickIndexes(12)).toEqual([0, 2, 4, 6, 8, 10, 12]);
    expect(monthTickIndexes(36)).toEqual([0, 6, 12, 18, 24, 30, 36]);
    expect(monthTickIndexes(13)).toEqual([0, 3, 6, 9, 13]);
    expect(monthTickIndexes(1)).toEqual([0, 1]);
  });
});
