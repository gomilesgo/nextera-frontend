export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    retryAfterSeconds?: number;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string[]>;
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: string,
    message: string,
    extra: { fields?: Record<string, string[]>; retryAfterSeconds?: number } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = extra.fields;
    this.retryAfterSeconds = extra.retryAfterSeconds;
  }
}

export const MAX_READ_RETRIES = 2;

export function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

export function shouldRetryRead(failureCount: number, error: unknown): boolean {
  if (isClientError(error)) return false;
  return failureCount < MAX_READ_RETRIES;
}

export function authLossReason(error: unknown): "session" | "blocked" | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 401) return "session";
  if (error.status === 403 && error.code === "account_blocked") return "blocked";
  return null;
}

function readFields(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(value)) {
    if (!Array.isArray(messages)) continue;
    const strings = messages.filter((message): message is string => typeof message === "string");
    if (strings.length > 0) fields[key] = strings;
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

function readRetryAfter(value: unknown, response: Response): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  const header = Number(response.headers.get("retry-after"));
  return Number.isFinite(header) && header > 0 ? header : undefined;
}

export async function readApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const error =
    body && typeof body === "object" && "error" in body ? (body as { error: unknown }).error : undefined;
  if (error && typeof error === "object") {
    const raw = error as Record<string, unknown>;
    return new ApiError(
      response.status,
      typeof raw.code === "string" ? raw.code : "internal",
      typeof raw.message === "string" ? raw.message : "Something went wrong",
      { fields: readFields(raw.fields), retryAfterSeconds: readRetryAfter(raw.retryAfterSeconds, response) },
    );
  }
  return new ApiError(response.status, response.status >= 500 ? "unavailable" : "internal", "Something went wrong");
}
