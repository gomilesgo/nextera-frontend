type LineChartProps = {
  title: string;
  labels: string[];
  values: number[];
  formatValue: (n: number) => string;
  color?: string;
};

const CHART_H = 100;
const CHART_W = 560;

export function LineChart({ title, labels, values, formatValue, color = "var(--color-gold)" }: LineChartProps) {
  if (labels.length === 0) return null;

  const maxValue = Math.max(...values, 1);

  function point(i: number): [number, number] {
    const x = labels.length === 1 ? CHART_W / 2 : (i / (labels.length - 1)) * CHART_W;
    const y = CHART_H - Math.max(1, Math.round((values[i]! / maxValue) * (CHART_H - 2)));
    return [x, y];
  }

  const points = labels.map((_, i) => point(i));
  const polylinePoints = points.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPoints = [
    `0,${CHART_H}`,
    ...points.map(([x, y]) => `${x},${y}`),
    `${CHART_W},${CHART_H}`,
  ].join(" ");

  return (
    <div className="grid gap-3">
      <svg
        role="img"
        aria-label={title}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full overflow-visible"
        style={{ maxHeight: `${CHART_H}px` }}
      >
        <title>{title}</title>
        <polygon points={areaPoints} fill={color} opacity="0.12" />
        <polyline points={polylinePoints} fill="none" stroke={color} strokeWidth="1.5" />
        {points.map(([x, y], i) => (
          <circle
            key={labels[i]}
            cx={x}
            cy={y}
            r="2.5"
            fill={color}
            aria-label={`${labels[i]}: ${formatValue(values[i]!)}`}
          />
        ))}
      </svg>
      <details className="text-xs">
        <summary className="cursor-pointer text-dust hover:text-parchment">Data table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="data-table text-xs">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" className="num">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {labels.map((label, i) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td className="num font-mono">{formatValue(values[i]!)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
