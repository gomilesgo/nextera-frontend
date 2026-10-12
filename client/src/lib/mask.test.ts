import { describe, expect, it } from "vitest";
import { accountEnding, maskAccountNumber, maskPan, safeLast4, safeMaskedPan } from "./mask";

describe("maskPan", () => {
  it("keeps only the last four characters", () => {
    expect(maskPan("ABCDE1234F")).toBe("XXXXXX234F");
    expect(maskPan(" abcde1234f ")).toBe("XXXXXX234F");
  });
});

describe("maskAccountNumber", () => {
  it("keeps only the last four digits", () => {
    expect(maskAccountNumber("1234 5678 9012")).toBe("XXXX9012");
    expect(maskAccountNumber("000123456789")).toBe("XXXX6789");
  });
});

describe("safeMaskedPan", () => {
  it("passes masked values through", () => {
    expect(safeMaskedPan("XXXXXX234F")).toBe("XXXXXX234F");
  });

  it("masks a full PAN if one ever arrives", () => {
    expect(safeMaskedPan("ABCDE1234F")).toBe("XXXXXX234F");
  });

  it("refuses anything else", () => {
    expect(safeMaskedPan("ABCDE1234")).toBeNull();
    expect(safeMaskedPan(42)).toBeNull();
    expect(safeMaskedPan("XXXX234F")).toBeNull();
  });
});

describe("account display", () => {
  it("shows the last four digits only", () => {
    expect(accountEnding("9012")).toBe("•••• 9012");
    expect(safeLast4("9012")).toBe("9012");
    expect(safeLast4("123456789012")).toBe("9012");
    expect(safeLast4("12")).toBeNull();
    expect(safeLast4(null)).toBeNull();
  });
});
