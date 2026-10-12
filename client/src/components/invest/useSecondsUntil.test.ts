import { describe, expect, it } from "vitest";
import { formatClock, remainingSeconds } from "./useSecondsUntil";

describe("remainingSeconds", () => {
  const deadline = { endsAt: 1_000_000 + 300_000, seconds: 300 };

  it("counts down from the server-relative duration", () => {
    expect(remainingSeconds(deadline, 1_000_000)).toBe(300);
    expect(remainingSeconds(deadline, 1_000_000 + 299_500)).toBe(1);
    expect(remainingSeconds(deadline, 1_000_000 + 300_000)).toBe(0);
    expect(remainingSeconds(deadline, 9_999_999)).toBe(0);
  });

  it("never shows more than the duration when the clock snapshot is stale", () => {
    expect(remainingSeconds(deadline, 0)).toBe(300);
    expect(remainingSeconds(null, 0)).toBe(0);
  });

  it("formats minutes and seconds", () => {
    expect(formatClock(272)).toBe("4:32");
    expect(formatClock(9)).toBe("9s");
  });
});
