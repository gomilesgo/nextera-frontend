import type { InvestmentGrowth } from "@nextera/contracts";

export type GrowthChartPoint = {
  month: number;
  date: string;
  returnsPaise: number;
  credited: boolean;
};

export function growthPoints(growth: Pick<InvestmentGrowth, "schedule">, startDate: string): GrowthChartPoint[] {
  return [
    { month: 0, date: startDate, returnsPaise: 0, credited: true },
    ...growth.schedule.map((period) => ({
      month: period.periodNo,
      date: period.dueDate,
      returnsPaise: period.cumulativePaise,
      credited: period.credited,
    })),
  ];
}

export function lastCreditedMonth(points: GrowthChartPoint[]): number {
  let last = 0;
  for (const point of points) if (point.credited) last = point.month;
  return last;
}
