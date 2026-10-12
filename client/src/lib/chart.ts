export function niceCeiling(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const fraction = value / base;
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((candidate) => fraction <= candidate) ?? 10;
  return step * base;
}

export function linearTicks(max: number, count = 4): number[] {
  const top = niceCeiling(max);
  return Array.from({ length: count + 1 }, (_, index) => (top / count) * index);
}

export function compactRupees(paise: number): string {
  const rupees = paise / 100;
  const trim = (value: number) => value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  if (rupees >= 10_000_000) return `₹${trim(rupees / 10_000_000)} Cr`;
  if (rupees >= 100_000) return `₹${trim(rupees / 100_000)} L`;
  if (rupees >= 1_000) return `₹${trim(rupees / 1_000)}K`;
  return `₹${trim(rupees)}`;
}

export function monthTickIndexes(lastMonth: number, maxTicks = 6): number[] {
  if (lastMonth <= 0) return [0];
  const step = Math.max(1, Math.ceil(lastMonth / maxTicks));
  const ticks: number[] = [];
  for (let month = 0; month <= lastMonth; month += step) ticks.push(month);
  if (ticks[ticks.length - 1] !== lastMonth) {
    if (lastMonth - (ticks[ticks.length - 1] ?? 0) < step / 2) ticks.pop();
    ticks.push(lastMonth);
  }
  return ticks;
}
