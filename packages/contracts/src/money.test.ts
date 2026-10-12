import { describe, expect, it } from "vitest";
import {
  formatBps,
  formatPaise,
  paiseToRupees,
  percentToBps,
  rupeesToPaise,
} from "./money";

describe("rupeesToPaise", () => {
  it("converts whole and fractional rupees", () => {
    expect(rupeesToPaise(1350000)).toBe(135000000);
    expect(rupeesToPaise(10.5)).toBe(1050);
  });

  it("rounds away float noise", () => {
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });

  it("rejects non-finite and unsafe amounts", () => {
    expect(() => rupeesToPaise(Number.NaN)).toThrow(RangeError);
    expect(() => rupeesToPaise(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});

describe("paiseToRupees", () => {
  it("divides by one hundred", () => {
    expect(paiseToRupees(900000)).toBe(9000);
  });
});

describe("formatPaise", () => {
  it("uses Indian digit grouping without decimals for whole rupees", () => {
    expect(formatPaise(135000000)).toBe("₹13,50,000");
    expect(formatPaise(900000)).toBe("₹9,000");
  });

  it("shows two decimals when there are paise", () => {
    expect(formatPaise(900050)).toBe("₹9,000.50");
  });
});

describe("bps helpers", () => {
  it("converts percent to basis points", () => {
    expect(percentToBps(8)).toBe(800);
    expect(percentToBps(8.25)).toBe(825);
  });

  it("formats basis points as a trimmed percentage", () => {
    expect(formatBps(800)).toBe("8%");
    expect(formatBps(850)).toBe("8.5%");
    expect(formatBps(825)).toBe("8.25%");
    expect(formatBps(1000)).toBe("10%");
  });
});
