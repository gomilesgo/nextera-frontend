import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows requests up to the limit", () => {
    const check = createRateLimiter({ limit: 3, windowMs: 60_000 });
    const now = 1_000_000;
    expect(check("ip1", now).allowed).toBe(true);
    expect(check("ip1", now).allowed).toBe(true);
    expect(check("ip1", now).allowed).toBe(true);
  });

  it("blocks the request that exceeds the limit", () => {
    const check = createRateLimiter({ limit: 3, windowMs: 60_000 });
    const now = 1_000_000;
    check("ip1", now);
    check("ip1", now);
    check("ip1", now);
    const result = check("ip1", now);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the count after the window elapses", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 60_000 });
    const now = 1_000_000;
    check("ip1", now);
    check("ip1", now);
    expect(check("ip1", now).allowed).toBe(false);
    expect(check("ip1", now + 60_001).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const now = 1_000_000;
    expect(check("ip1", now).allowed).toBe(true);
    expect(check("ip2", now).allowed).toBe(true);
    expect(check("ip1", now).allowed).toBe(false);
  });

  it("evicts the oldest key when maxKeys is reached", () => {
    const check = createRateLimiter({ limit: 5, windowMs: 60_000, maxKeys: 2 });
    const t0 = 1_000_000;
    check("ip1", t0);
    check("ip2", t0 + 1);
    check("ip3", t0 + 2);
    const result = check("ip1", t0 + 3);
    expect(result.allowed).toBe(true);
  });

  it("retryAfterSeconds reflects the remaining window time", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const now = 1_000_000;
    check("ip1", now);
    const result = check("ip1", now + 10_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(50);
  });
});
