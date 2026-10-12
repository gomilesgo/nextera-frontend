import { describe, expect, it } from "vitest";
import { diffJson, prettyJson } from "./diff";

describe("diffJson", () => {
  it("reports changed, added and unchanged leaves by path", () => {
    expect(diffJson({ status: "active", name: "Asha" }, { status: "blocked", name: "Asha", reason: "Fraud check" })).toEqual([
      { path: "status", kind: "changed", before: '"active"', after: '"blocked"' },
      { path: "name", kind: "unchanged", before: '"Asha"', after: '"Asha"' },
      { path: "reason", kind: "added", after: '"Fraud check"' },
    ]);
  });

  it("walks nested objects and arrays", () => {
    expect(diffJson({ a: { b: [1, 2] } }, { a: { b: [1] } })).toEqual([
      { path: "a.b[0]", kind: "unchanged", before: "1", after: "1" },
      { path: "a.b[1]", kind: "removed", before: "2" },
    ]);
  });

  it("treats null sides as empty so creates and deletes read naturally", () => {
    expect(diffJson(null, { id: "c1" })).toEqual([{ path: "id", kind: "added", after: '"c1"' }]);
    expect(diffJson({ id: "c1" }, null)).toEqual([{ path: "id", kind: "removed", before: '"c1"' }]);
    expect(diffJson(null, null)).toEqual([]);
    expect(diffJson("x", "y")).toEqual([{ path: "(value)", kind: "changed", before: '"x"', after: '"y"' }]);
  });

  it("keeps markup as inert text", () => {
    const [line] = diffJson({ memo: "a" }, { memo: "<img src=x onerror=alert(1)>" });
    expect(line?.after).toBe('"<img src=x onerror=alert(1)>"');
  });
});

describe("prettyJson", () => {
  it("indents JSON and handles empty sides", () => {
    expect(prettyJson({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(prettyJson(null)).toBe("null");
    expect(prettyJson(undefined)).toBe("null");
  });
});
