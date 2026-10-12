import { describe, expect, it } from "vitest";
import { QUEUE_MAX_LIMIT, QUEUE_PAGE_SIZE, hasMore, nextLimit, pickStatus } from "./queue";

describe("queue paging", () => {
  it("grows by one page up to the backend maximum", () => {
    expect(nextLimit(QUEUE_PAGE_SIZE)).toBe(100);
    expect(nextLimit(180)).toBe(QUEUE_MAX_LIMIT);
    expect(nextLimit(QUEUE_MAX_LIMIT)).toBe(QUEUE_MAX_LIMIT);
  });

  it("only offers more when the page came back full", () => {
    expect(hasMore(50, 50)).toBe(true);
    expect(hasMore(49, 50)).toBe(false);
    expect(hasMore(200, 200)).toBe(false);
  });

  it("falls back to the default status for unknown filters", () => {
    const statuses = ["submitted", "verified", "rejected"] as const;
    expect(pickStatus(statuses, "verified", "submitted")).toBe("verified");
    expect(pickStatus(statuses, "none", "submitted")).toBe("submitted");
    expect(pickStatus(statuses, undefined, "submitted")).toBe("submitted");
  });
});
