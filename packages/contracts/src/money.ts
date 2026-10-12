const wholeRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const withPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new RangeError("Amount must be a finite number");
  const paise = Math.round(rupees * 100);
  if (!Number.isSafeInteger(paise)) throw new RangeError("Amount is too large");
  return paise;
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatPaise(paise: number): string {
  const formatter = paise % 100 === 0 ? wholeRupees : withPaise;
  return formatter.format(paise / 100);
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}
