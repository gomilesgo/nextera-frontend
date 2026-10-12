import { settingsSchema } from "@nextera/contracts";
import type { Settings } from "@nextera/contracts";

export function toSettings(value: unknown): Settings | null {
  const parsed = settingsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
