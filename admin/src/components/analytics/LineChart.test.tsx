import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LineChart } from "./LineChart";

describe("LineChart", () => {
  it("renders a data table row for each label", () => {
    const html = renderToStaticMarkup(
      <LineChart
        title="AUM"
        labels={["Jan 2026", "Feb 2026", "Mar 2026"]}
        values={[1000, 2000, 3000]}
        formatValue={(n) => `₹${n}`}
      />,
    );
    const rows = html.match(/<tr/g)?.length ?? 0;
    expect(rows).toBe(4);
    expect(html).toContain("₹1000");
    expect(html).toContain("₹3000");
  });

  it("applies formatValue to every cell in the data table", () => {
    const html = renderToStaticMarkup(
      <LineChart
        title="Flow"
        labels={["Oct 2026", "Nov 2026"]}
        values={[500000, 750000]}
        formatValue={(n) => `$${n / 100}`}
      />,
    );
    expect(html).toContain("$5000");
    expect(html).toContain("$7500");
  });

  it("returns null when labels is empty", () => {
    const html = renderToStaticMarkup(
      <LineChart
        title="Empty"
        labels={[]}
        values={[]}
        formatValue={String}
      />,
    );
    expect(html).toBe("");
  });
});
