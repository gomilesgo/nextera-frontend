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

  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
  }
}

function readEnvelope(body: unknown, status: number): ApiErrorBody["error"] {
  const error =
    body && typeof body === "object" && "error" in body ? (body as ApiErrorBody).error : null;
  if (error && typeof error.code === "string" && typeof error.message === "string") return error;
  return {
    code: status >= 500 ? "unavailable" : "internal",
    message: "The console could not load this data. Please try again.",
  };
}

export async function fetchJson<T>(url: string, fetcher: typeof fetch = fetch): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, { code: "unavailable", message: "You appear to be offline. Please try again." });
  }
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (!response.ok) throw new ApiError(response.status, readEnvelope(body, response.status));
  return body as T;
}
