import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Pagination } from "./Pagination";

function render(offset: number, total: number) {
  return renderToStaticMarkup(
    <Pagination label="Customers" window={{ limit: 25, offset }} total={total} onOffset={vi.fn()} />,
  );
}

describe("Pagination", () => {
  it("summarises the visible window", () => {
    const html = render(25, 60);
    expect(html).toContain("Showing 26–50 of 60");
    expect(html).toContain("Page 2 of 3");
  });

  it("offers the first page instead of an impossible range when the offset is past the end", () => {
    const html = render(100, 51);
    expect(html).toContain("No results on this page.");
    expect(html).toContain("Go to the first page");
    expect(html).not.toContain("Showing");
    expect(html).not.toContain("Page 5 of 3");
    expect(html).toContain("3 pages");
  });

  it("keeps the empty list message", () => {
    expect(render(0, 0)).toContain("No customers");
  });
});
