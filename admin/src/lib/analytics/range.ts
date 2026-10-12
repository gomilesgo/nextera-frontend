const MONTH_RE = /^\d{4}-\d{2}$/;

export const ANALYTICS_MAX_MONTHS = 36;

function clampMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const year = y ?? 2020;
  const month = Math.min(12, Math.max(1, m ?? 1));
  return `${year}-${String(month).padStart(2, "0")}`;
}

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  let year = y ?? 2020;
  let month = (m ?? 1) + delta;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function currentMonthLabel(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthCount(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty! - fy!) * 12 + (tm! - fm!) + 1;
}

export type AnalyticsRange = { from: string; to: string };

export function resolveAnalyticsRange(raw: {
  from?: string | string[] | undefined;
  to?: string | string[] | undefined;
}): AnalyticsRange {
  const current = currentMonthLabel();
  const defaultFrom = addMonths(current, -11);

  const rawFrom = Array.isArray(raw.from) ? raw.from[0] : raw.from;
  const rawTo = Array.isArray(raw.to) ? raw.to[0] : raw.to;

  let from = rawFrom && MONTH_RE.test(rawFrom) ? clampMonth(rawFrom) : defaultFrom;
  const to = rawTo && MONTH_RE.test(rawTo) ? clampMonth(rawTo) : current;

  if (from > to) from = addMonths(to, -(ANALYTICS_MAX_MONTHS - 1));

  if (monthCount(from, to) > ANALYTICS_MAX_MONTHS) {
    from = addMonths(to, -(ANALYTICS_MAX_MONTHS - 1));
  }

  return { from, to };
}
