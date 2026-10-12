import { isoDateSchema } from "@nextera/contracts";
import { isUuid } from "@/lib/shape";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export type AssigneeFilter = "none" | "me" | string;

export const SEARCH_MAX_LENGTH = 100;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function pickOption<T extends string>(options: readonly T[], value: string | string[] | undefined): T | undefined {
  const raw = first(value)?.trim();
  return raw && (options as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

export function pickSearch(value: string | string[] | undefined): string | undefined {
  const raw = first(value)?.trim();
  return raw ? raw.slice(0, SEARCH_MAX_LENGTH) : undefined;
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isoDateSchema.safeParse(value).success;
}

export function pickDate(value: string | string[] | undefined): string | undefined {
  const raw = first(value)?.trim();
  return raw && isIsoDate(raw) ? raw : undefined;
}

export function pickAssignee(value: string | string[] | undefined): AssigneeFilter | undefined {
  const raw = first(value)?.trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "none" || raw === "me" || isUuid(raw)) return raw;
  return undefined;
}

export function resolveAssignee(filter: AssigneeFilter | undefined, meId: string): string | undefined {
  if (filter === "me") return meId;
  return filter;
}

export function toSearch(values: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  return params.toString();
}

export function withSearch(path: string, values: Record<string, string | undefined>): string {
  const search = toSearch(values);
  return search ? `${path}?${search}` : path;
}

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}
