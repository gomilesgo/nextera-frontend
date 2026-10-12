export type ScheduleInput = {
  principalPaise: number;
  rateBps: number;
  tenureMonths: number;
  startDate: string;
};

export type SchedulePeriod = {
  periodNo: number;
  dueDate: string;
  grossPaise: number;
  cumulativePaise: number;
};

export type ReturnsSummary = {
  monthlyPaise: number;
  totalReturnPaise: number;
  maturityValuePaise: number;
  maturityDate: string;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

export function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const match = ISO_DATE.exec(value);
  if (!match) throw new RangeError(`Invalid date: ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`Invalid date: ${value}`);
  }
  return { year, month, day };
}

export function addMonthsClamped(isoDate: string, months: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return `${pad(targetYear, 4)}-${pad(targetMonth, 2)}-${pad(targetDay, 2)}`;
}

export function monthlyReturnPaise(principalPaise: number, rateBps: number): number {
  return Number((BigInt(principalPaise) * BigInt(rateBps)) / 120000n);
}

function assertInput(input: ScheduleInput): void {
  if (!Number.isSafeInteger(input.principalPaise) || input.principalPaise <= 0) {
    throw new RangeError("principalPaise must be a positive integer");
  }
  if (!Number.isInteger(input.rateBps) || input.rateBps < 0) {
    throw new RangeError("rateBps must be a non-negative integer");
  }
  if (!Number.isInteger(input.tenureMonths) || input.tenureMonths < 1) {
    throw new RangeError("tenureMonths must be at least 1");
  }
  parseIsoDate(input.startDate);
}

export function projectSchedule(input: ScheduleInput): SchedulePeriod[] {
  assertInput(input);
  const monthly = monthlyReturnPaise(input.principalPaise, input.rateBps);
  return Array.from({ length: input.tenureMonths }, (_, index) => {
    const periodNo = index + 1;
    return {
      periodNo,
      dueDate: addMonthsClamped(input.startDate, periodNo),
      grossPaise: monthly,
      cumulativePaise: monthly * periodNo,
    };
  });
}

export function calculateReturns(input: ScheduleInput): ReturnsSummary {
  assertInput(input);
  const monthlyPaise = monthlyReturnPaise(input.principalPaise, input.rateBps);
  const totalReturnPaise = monthlyPaise * input.tenureMonths;
  return {
    monthlyPaise,
    totalReturnPaise,
    maturityValuePaise: input.principalPaise + totalReturnPaise,
    maturityDate: addMonthsClamped(input.startDate, input.tenureMonths),
  };
}
