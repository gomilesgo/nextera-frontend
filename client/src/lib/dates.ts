import { parseIsoDate } from "@nextera/contracts";

const INDIA = "Asia/Kolkata";

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: INDIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const longFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timestampFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: INDIA,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  month: "short",
  year: "2-digit",
});

export function todayInIndia(now: Date = new Date()): string {
  return isoFormatter.format(now);
}

function toUtcDate(isoDate: string): Date {
  const { year, month, day } = parseIsoDate(isoDate);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatIsoDate(isoDate: string): string {
  return longFormatter.format(toUtcDate(isoDate));
}

export function formatIsoMonth(isoDate: string): string {
  return monthFormatter.format(toUtcDate(isoDate));
}

export function formatTimestamp(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : timestampFormatter.format(date);
}
