import { describe, expect, it } from "vitest";
import { describedBy, firstInvalid } from "./a11y";

describe("describedBy", () => {
  it("links the hint and the error together", () => {
    expect(describedBy("pan", true, true)).toBe("pan-hint pan-error");
    expect(describedBy("pan", true, false)).toBe("pan-error");
    expect(describedBy("pan", false, true)).toBe("pan-hint");
    expect(describedBy("pan")).toBeUndefined();
  });
});

describe("firstInvalid", () => {
  it("follows the form order", () => {
    expect(firstInvalid(["pan", "dob", "city"] as const, { city: "x", dob: "y" })).toBe("dob");
    expect(firstInvalid(["pan"] as const, {})).toBeNull();
  });
});
