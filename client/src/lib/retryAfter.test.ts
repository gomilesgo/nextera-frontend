import { describe, expect, it } from "vitest";
import { retryAfterPhrase, retryAfterSentence } from "./retryAfter";

describe("retryAfterPhrase", () => {
  it("is empty without a usable wait", () => {
    expect(retryAfterPhrase(undefined)).toBeNull();
    expect(retryAfterPhrase(0)).toBeNull();
    expect(retryAfterPhrase(-5)).toBeNull();
    expect(retryAfterPhrase(Number.NaN)).toBeNull();
  });

  it("uses seconds, then minutes, then hours", () => {
    expect(retryAfterPhrase(1)).toBe("1 second");
    expect(retryAfterPhrase(45)).toBe("45 seconds");
    expect(retryAfterPhrase(90)).toBe("about 2 minutes");
    expect(retryAfterPhrase(60 * 60)).toBe("about 60 minutes");
    expect(retryAfterPhrase(90 * 60)).toBe("about 2 hours");
    expect(retryAfterPhrase(24 * 60 * 60 - 1)).toBe("about 24 hours");
  });
});

describe("retryAfterSentence", () => {
  it("falls back to a vague wait when none is given", () => {
    expect(retryAfterSentence(undefined)).toBe("Please try again shortly.");
    expect(retryAfterSentence(3600 * 5)).toBe("Please try again in about 5 hours.");
  });
});
