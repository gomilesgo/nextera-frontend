import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart } from "./BarChart";

describe("BarChart", () => {
  it("renders a data table row for each label", () => {
    const html = renderToStaticMarkup(
      <BarChart
        title="Test chart"
        labels={["Jan 2026", "Feb 2026"]}
        series={[{ key: "val", color: "red", label: "Value" }]}
        values={{ val: [100, 200] }}
        formatValue={(n) => `£${n}`}
      />,
    );
    const rows = html.match(/<tr/g)?.length ?? 0;
    expect(rows).toBe(3);
    expect(html).toContain("£100");
    expect(html).toContain("£200");
  });

  it("renders correct row count for multi-series chart", () => {
    const html = renderToStaticMarkup(
      <BarChart
        title="Multi"
        labels={["Oct 2026", "Nov 2026", "Dec 2026"]}
        series={[
          { key: "a", color: "blue", label: "Series A" },
          { key: "b", color: "green", label: "Series B" },
        ]}
        values={{ a: [10, 20, 30], b: [5, 15, 25] }}
        formatValue={String}
      />,
    );
    const rows = html.match(/<tr/g)?.length ?? 0;
    expect(rows).toBe(4);
    expect(html).toContain("Series A");
    expect(html).toContain("Series B");
  });

  it("returns null when labels is empty", () => {
    const html = renderToStaticMarkup(
      <BarChart
        title="Empty"
        labels={[]}
        series={[{ key: "val", color: "red", label: "Value" }]}
        values={{ val: [] }}
        formatValue={String}
      />,
    );
    expect(html).toBe("");
  });
});
