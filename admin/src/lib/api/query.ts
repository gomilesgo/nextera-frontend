import type { ZodType, ZodTypeDef } from "zod";
import { errorResponse } from "./respond";

export function parseSearch<T>(
  schema: ZodType<T, ZodTypeDef, unknown>,
  searchParams: URLSearchParams,
  keys: readonly string[],
): { ok: true; data: T } | { ok: false; response: Response } {
  const raw: Record<string, string> = {};
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null) raw[key] = value;
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fields: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    (fields[issue.path.map(String).join(".") || "_"] ??= []).push(issue.message);
  }
  return {
    ok: false,
    response: errorResponse({ code: "validation", message: "Invalid query parameters", fields }),
  };
}
