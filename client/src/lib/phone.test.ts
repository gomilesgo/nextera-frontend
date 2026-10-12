import { describe, expect, it } from "vitest";
import { formatIndianMobile, maskIndianMobile, normalizeIndianMobile } from "./phone";

describe("normalizeIndianMobile", () => {
  it("accepts common ways of writing an Indian mobile number", () => {
    for (const input of ["9876543210", "09876543210", "+91 98765 43210", "91-98765-43210", "(+91) 98765 43210"]) {
      expect(normalizeIndianMobile(input)).toBe("+919876543210");
    }
  });

  it("rejects landlines, short numbers and foreign numbers", () => {
    for (const input of ["", "5876543210", "987654321", "98765432100", "+14155550100", "abcdefghij"]) {
      expect(normalizeIndianMobile(input)).toBeNull();
    }
  });
});

describe("formatIndianMobile", () => {
  it("groups the digits for display", () => {
    expect(formatIndianMobile("+919876543210")).toBe("+91 98765 43210");
    expect(formatIndianMobile("+14155550100")).toBe("+14155550100");
  });
});

describe("maskIndianMobile", () => {
  it("hides the middle digits", () => {
    expect(maskIndianMobile("+919876543210")).toBe("+91 98•••• ••10");
  });
});
