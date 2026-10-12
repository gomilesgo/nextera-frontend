import { describe, expect, it } from "vitest";
import { attachmentHeaders } from "./download";

function headers(values: Record<string, string>): Headers {
  return new Headers(values);
}

describe("attachmentHeaders", () => {
  it("forwards content-length when there is no content-encoding", () => {
    const result = attachmentHeaders(
      headers({ "content-type": "application/pdf", "content-length": "1234", "content-disposition": 'attachment; filename="a.pdf"' }),
    );
    expect(result.get("content-length")).toBe("1234");
  });

  it("omits content-length when content-encoding is present", () => {
    const result = attachmentHeaders(
      headers({
        "content-type": "application/pdf",
        "content-encoding": "gzip",
        "content-length": "500",
        "content-disposition": 'attachment; filename="a.pdf"',
      }),
    );
    expect(result.get("content-length")).toBeNull();
  });

  it("omits content-length when it is not a plain integer", () => {
    const result = attachmentHeaders(headers({ "content-type": "application/pdf", "content-length": "5e3" }));
    expect(result.get("content-length")).toBeNull();
  });

  it("sets safe security headers on every response", () => {
    const result = attachmentHeaders(headers({ "content-type": "application/pdf" }));
    expect(result.get("cache-control")).toBe("no-store");
    expect(result.get("x-content-type-options")).toBe("nosniff");
    expect(result.get("content-security-policy")).toContain("default-src 'none'");
  });
});
