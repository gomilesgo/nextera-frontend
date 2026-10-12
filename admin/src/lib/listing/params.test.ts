import { describe, expect, it } from "vitest";
import { pageNumbers, readPageWindow, readParam, toSearchString, withSearch } from "./params";

describe("readParam", () => {
  it("reads the first value from page props and URLSearchParams alike", () => {
    expect(readParam({ q: ["a", "b"] }, "q")).toBe("a");
    expect(readParam({ q: "a" }, "q")).toBe("a");
    expect(readParam({}, "q")).toBeUndefined();
    expect(readParam(new URLSearchParams("q=a&q=b"), "q")).toBe("a");
    expect(readParam(new URLSearchParams(""), "q")).toBeUndefined();
  });
});

describe("readPageWindow", () => {
  it("defaults to the first page of the list size", () => {
    expect(readPageWindow({})).toEqual({ limit: 25, offset: 0 });
    expect(readPageWindow({}, 50)).toEqual({ limit: 50, offset: 0 });
  });

  it("ignores malformed or out of range numbers", () => {
    expect(readPageWindow({ limit: "0", offset: "-25" })).toEqual({ limit: 25, offset: 0 });
    expect(readPageWindow({ limit: "500", offset: "abc" })).toEqual({ limit: 25, offset: 0 });
    expect(readPageWindow({ limit: "1e2", offset: "25.5" })).toEqual({ limit: 25, offset: 0 });
    expect(readPageWindow({ offset: "99999999" })).toEqual({ limit: 25, offset: 0 });
  });

  it("snaps offsets onto page boundaries", () => {
    expect(readPageWindow({ offset: "60" })).toEqual({ limit: 25, offset: 50 });
    expect(readPageWindow({ limit: "10", offset: "30" })).toEqual({ limit: 10, offset: 30 });
  });
});

describe("toSearchString", () => {
  it("drops empty values and defaults", () => {
    expect(toSearchString({ q: "asha", status: undefined, empty: "", offset: 0, limit: 25 }, { offset: 0, limit: 25 })).toBe(
      "q=asha",
    );
    expect(toSearchString({ offset: 50, limit: 25 }, { offset: 0, limit: 25 })).toBe("offset=50");
    expect(toSearchString({ q: "a&b=c" })).toBe("q=a%26b%3Dc");
  });

  it("builds paths without a dangling question mark", () => {
    expect(withSearch("/customers", "")).toBe("/customers");
    expect(withSearch("/customers", "q=a")).toBe("/customers?q=a");
  });
});

describe("pageNumbers", () => {
  it("describes the visible window", () => {
    expect(pageNumbers({ limit: 25, offset: 0 }, 60)).toEqual({
      page: 1,
      pages: 3,
      from: 1,
      to: 25,
      pastEnd: false,
      hasPrevious: false,
      hasNext: true,
      previousOffset: 0,
      nextOffset: 25,
    });
    expect(pageNumbers({ limit: 25, offset: 50 }, 60)).toMatchObject({ page: 3, from: 51, to: 60, hasNext: false });
  });

  it("handles empty lists and offsets past the end", () => {
    expect(pageNumbers({ limit: 25, offset: 0 }, 0)).toMatchObject({ pages: 1, from: 0, to: 0, hasNext: false });
    expect(pageNumbers({ limit: 25, offset: 0 }, 0)).toMatchObject({ pastEnd: false });
    expect(pageNumbers({ limit: 25, offset: 100 }, 30)).toMatchObject({ page: 5, pastEnd: true, hasPrevious: true, hasNext: false });
    expect(pageNumbers({ limit: 25, offset: 50 }, 50)).toMatchObject({ pastEnd: true });
    expect(pageNumbers({ limit: 25, offset: 25 }, 50)).toMatchObject({ pastEnd: false, from: 26, to: 50 });
  });
});
