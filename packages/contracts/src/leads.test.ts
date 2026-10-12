import { describe, expect, it } from "vitest";
import { LEAD_REF_PATTERN, leadCreateSchema } from "./leads";

describe("leadCreateSchema", () => {
  it("accepts the minimal enquiry and trims values", () => {
    expect(leadCreateSchema.parse({ name: " Asha Rao ", phone: "+919876543210", path: "/enquire" })).toEqual({
      name: "Asha Rao",
      phone: "+919876543210",
      path: "/enquire",
    });
  });

  it("lowercases email and rejects relative paths", () => {
    expect(
      leadCreateSchema.parse({ name: "Asha", phone: "+919876543210", email: "A@X.IN", path: "/" }).email,
    ).toBe("a@x.in");
    expect(leadCreateSchema.safeParse({ name: "Asha", phone: "+919876543210", path: "enquire" }).success).toBe(false);
  });
});

describe("LEAD_REF_PATTERN", () => {
  it("matches NXL-YYMM-NNNN with four or more sequence digits", () => {
    expect(LEAD_REF_PATTERN.test("NXL-2610-0042")).toBe(true);
    expect(LEAD_REF_PATTERN.test("SRA-2610-0042")).toBe(false);
    expect(LEAD_REF_PATTERN.test("NXL-261-0042")).toBe(false);
    expect(LEAD_REF_PATTERN.test("NXL-2610-10000")).toBe(true);
    expect(LEAD_REF_PATTERN.test("NXL-2610-042")).toBe(false);
  });
});
