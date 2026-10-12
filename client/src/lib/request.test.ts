import { describe, expect, it } from "vitest";
import { clientIp, safePortalPath } from "./request";

describe("clientIp", () => {
  it("takes the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1" }))).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip and then null", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(new Headers())).toBeNull();
  });
});

describe("safePortalPath", () => {
  it("keeps portal paths with their query", () => {
    expect(safePortalPath("/portal")).toBe("/portal");
    expect(safePortalPath("/portal/plans/gold-12?amount=50000")).toBe("/portal/plans/gold-12?amount=50000");
  });

  it("normalises dot segments before checking the prefix", () => {
    expect(safePortalPath("/portal/../enquire")).toBe("/portal");
    expect(safePortalPath("/portal/plans/../plans")).toBe("/portal/plans");
  });

  it("rejects anything outside the portal or back to login", () => {
    for (const value of [
      null,
      "",
      "https://evil.test/portal",
      "//evil.test/portal",
      "/\\evil.test",
      "portal",
      "/",
      "/enquire",
      "/portalx",
      "/portal/login",
      "/portal/login?next=/portal",
    ]) {
      expect(safePortalPath(value)).toBe("/portal");
    }
  });
});
