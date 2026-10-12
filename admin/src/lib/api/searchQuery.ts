import type { z } from "zod";
import { issuesToFields } from "@/lib/listing/params";
import { errorResponse } from "./respond";

export type ParsedQuery<T> = { ok: true; data: T } | { ok: false; response: Response };

export function parseSearchQuery<T>(
  request: Request,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): ParsedQuery<T> {
  const params = new URL(request.url).searchParams;
  const parsed = schema.safeParse(Object.fromEntries(params));
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    response: errorResponse({
      code: "validation",
      message: "Some filters are not valid",
      fields: issuesToFields(parsed.error.issues),
    }),
  };
}
