import { describe, expect, it } from "vitest";
import { clamp01, creditsLanded, maturityReached, window01 } from "./run";

describe("clamp01", () => {
  it("keeps progress inside the act", () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(9)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe("window01", () => {
  it("holds at zero through the lead-in", () => {
    expect(window01(0, 0.2, 0.8)).toBe(0);
    expect(window01(0.2, 0.2, 0.8)).toBe(0);
  });

  it("reaches one at the settle point and stays there", () => {
    expect(window01(0.5, 0.2, 0.8)).toBeCloseTo(0.5, 5);
    expect(window01(0.8, 0.2, 0.8)).toBe(1);
    expect(window01(1, 0.2, 0.8)).toBe(1);
  });

  it("falls back to raw progress for a degenerate window", () => {
    expect(window01(0.3, 0.9, 0.1)).toBe(0.3);
  });
});

describe("creditsLanded", () => {
  it("lands nothing before the first credit", () => {
    expect(creditsLanded(0, 12)).toBe(0);
    expect(creditsLanded(0.14, 12)).toBe(0);
  });

  it("lands one credit at a time", () => {
    const seen = Array.from({ length: 101 }, (_, index) => creditsLanded(index / 100, 12));
    for (let index = 1; index < seen.length; index += 1) {
      expect(seen[index] - seen[index - 1]).toBeLessThanOrEqual(1);
      expect(seen[index]).toBeGreaterThanOrEqual(seen[index - 1]);
    }
  });

  it("completes the year before the act stops moving, and holds", () => {
    expect(creditsLanded(0.82, 12)).toBe(12);
    expect(creditsLanded(1, 12)).toBe(12);
    expect(creditsLanded(4, 12)).toBe(12);
    expect(creditsLanded(-2, 12)).toBe(0);
  });

  it("works for any tenure", () => {
    expect(creditsLanded(1, 36)).toBe(36);
    expect(creditsLanded(1, 0)).toBe(0);
  });
});

describe("maturityReached", () => {
  it("returns the principal only once the credits are done", () => {
    expect(maturityReached(0.5)).toBe(false);
    expect(maturityReached(0.82)).toBe(true);
    expect(maturityReached(1)).toBe(true);
  });
});
