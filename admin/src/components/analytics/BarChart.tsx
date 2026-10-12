type Series = {
  key: string;
  color: string;
  label: string;
};

type BarChartProps = {
  title: string;
  labels: string[];
  series: Series[];
  values: Record<string, number[]>;
  formatValue: (n: number) => string;
};

const CHART_H = 140;
const BAR_GAP = 2;

export function BarChart({ title, labels, series, values, formatValue }: BarChartProps) {
  if (labels.length === 0) return null;

  const allValues = series.flatMap((s) => values[s.key] ?? []).filter((v) => v > 0);
  const maxValue = Math.max(...allValues, 1);

  const groupCount = labels.length;
  const barsPerGroup = series.length;
  const totalBars = groupCount * barsPerGroup + (groupCount - 1);
  const barWidth = Math.max(4, Math.floor(560 / totalBars));
  const chartW = totalBars * barWidth + groupCount * BAR_GAP;

  return (
    <div className="grid gap-3">
      <svg
        role="img"
        aria-label={title}
        viewBox={`0 0 ${chartW} ${CHART_H}`}
        className="w-full overflow-visible"
        style={{ maxHeight: `${CHART_H}px` }}
      >
        <title>{title}</title>
        {labels.map((label, gi) => {
          const groupX = gi * (barsPerGroup * barWidth + BAR_GAP);
          return (
            <g key={label} role="group" aria-label={label}>
              {series.map((s, si) => {
                const val = (values[s.key] ?? [])[gi] ?? 0;
                const barH = Math.max(1, Math.round((val / maxValue) * CHART_H));
                const x = groupX + si * barWidth;
                const y = CHART_H - barH;
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={y}
                    width={barWidth - 1}
                    height={barH}
                    fill={s.color}
                    aria-label={`${s.label}: ${formatValue(val)}`}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-dust">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-[1px]"
              style={{ background: s.color }}
              aria-hidden="true"
            />
            {s.label}
          </span>
        ))}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-dust hover:text-parchment">Data table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="data-table text-xs">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="num">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, gi) => (
                <tr key={label}>
                  <td>{label}</td>
                  {series.map((s) => (
                    <td key={s.key} className="num font-mono">
                      {formatValue((values[s.key] ?? [])[gi] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
