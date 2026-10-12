import type { z } from "zod";
import { ADMIN_PAGE_LIMIT_MAX } from "@nextera/contracts";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export type ParamSource = URLSearchParams | SearchParamsRecord;

export const LIST_PAGE_SIZE = 25;

export type PageWindow = { limit: number; offset: number };

export const MAX_LIST_OFFSET = 1_000_000;

export function readParam(source: ParamSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) return source.get(key) ?? undefined;
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

export function lenient<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, value: unknown): T | undefined {
  if (value === undefined) return undefined;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function wholeNumber(raw: string | undefined, min: number, max: number): number | undefined {
  if (raw === undefined || !/^\d{1,7}$/.test(raw.trim())) return undefined;
  const value = Number(raw.trim());
  return value >= min && value <= max ? value : undefined;
}

export function readPageWindow(source: ParamSource, defaultLimit = LIST_PAGE_SIZE): PageWindow {
  const limit = wholeNumber(readParam(source, "limit"), 1, ADMIN_PAGE_LIMIT_MAX) ?? defaultLimit;
  const rawOffset = wholeNumber(readParam(source, "offset"), 0, MAX_LIST_OFFSET) ?? 0;
  return { limit, offset: rawOffset - (rawOffset % limit) };
}

export function toSearchString(
  values: Record<string, string | number | undefined>,
  defaults: Record<string, string | number> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "") continue;
    if (defaults[key] !== undefined && String(defaults[key]) === String(value)) continue;
    params.set(key, String(value));
  }
  return params.toString();
}

export function withSearch(path: string, search: string): string {
  return search ? `${path}?${search}` : path;
}

export function pageNumbers(window: PageWindow, total: number) {
  const page = Math.floor(window.offset / window.limit) + 1;
  const pages = Math.max(1, Math.ceil(total / window.limit));
  const from = total === 0 ? 0 : Math.min(window.offset + 1, total);
  const to = Math.min(window.offset + window.limit, total);
  return {
    page,
    pages,
    from,
    to,
    pastEnd: total > 0 && window.offset >= total,
    hasPrevious: window.offset > 0,
    hasNext: window.offset + window.limit < total,
    previousOffset: Math.max(0, window.offset - window.limit),
    nextOffset: window.offset + window.limit,
  };
}

export function issuesToFields(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}
