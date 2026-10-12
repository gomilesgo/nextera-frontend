import { describe, expect, it } from "vitest";
import { clientIp, firstParam, safeNextPath } from "./request";

describe("clientIp", () => {
  it("takes the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1" }))).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip and then null", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(new Headers())).toBeNull();
  });

  it("skips values that are not IP addresses", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "evil<script>, 10.0.0.1", "x-real-ip": "198.51.100.4" }))).toBe(
      "198.51.100.4",
    );
    expect(clientIp(new Headers({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(clientIp(new Headers({ "x-forwarded-for": "unknown", "x-real-ip": "not-an-ip" }))).toBeNull();
    expect(clientIp(new Headers({ "x-forwarded-for": "", "x-real-ip": "" }))).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/plans/abc?tab=1")).toBe("/plans/abc?tab=1");
  });

  it("rejects external, protocol-relative and login targets", () => {
    for (const value of [null, "", "https://evil.test", "//evil.test", "//evil", "/\\evil.test", "/\\evil", "plans", "/login", "/login?next=/x"]) {
      expect(safeNextPath(value), String(value)).toBe("/");
    }
  });

  it("rejects control characters that URL parsing would strip", () => {
    for (const value of ["/\t/evil.test", "/\n/evil.test", "/\r/evil.test", "/%09/evil.test", "/%0a/evil.test", "/\u0000x", "/\u007fx", "/%E0%A4%A"]) {
      expect(safeNextPath(value), JSON.stringify(value)).toBe("/");
    }
  });

  it("normalises the path and keeps the query", () => {
    expect(safeNextPath("/plans/../plans/new?x=1")).toBe("/plans/new?x=1");
    expect(safeNextPath("/plans#frag")).toBe("/plans");
  });
});

describe("firstParam", () => {
  it("unwraps repeated search params", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam("a")).toBe("a");
    expect(firstParam(undefined)).toBeUndefined();
  });
});
