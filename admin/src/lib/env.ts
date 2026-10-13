import { z } from "zod";

const serverEnvSchema = z.object({
  NEXTERA_BACKEND_URL: z
    .string({ required_error: "NEXTERA_BACKEND_URL is required" })
    .trim()
    .url("NEXTERA_BACKEND_URL must be an absolute URL"),
  NEXTERA_ADMIN_SERVICE_KEY: z
    .string({ required_error: "NEXTERA_ADMIN_SERVICE_KEY is required" })
    .trim()
    .min(16, "NEXTERA_ADMIN_SERVICE_KEY must be at least 16 characters"),
  NEXTERA_BACKEND_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

const runtimeKeys = ["NEXTERA_BACKEND_URL", "NEXTERA_ADMIN_SERVICE_KEY", "NEXTERA_BACKEND_TIMEOUT_MS"] as const;

export function runtimeServerEnv(): Record<string, string | undefined> {
  const source: Record<string, string | undefined> = {};
  for (const key of runtimeKeys) source[key] = process.env[key];
  return source;
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid admin environment: ${problems}`);
  }
  return result.data;
}
