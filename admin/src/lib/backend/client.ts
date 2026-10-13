import "server-only";
import { errorCodes } from "@nextera/contracts";
import type { ErrorCode } from "@nextera/contracts";

export const PASSWORD_CHANGE_REQUIRED = "password_change_required";

export type BackendErrorCode = ErrorCode | "unavailable" | typeof PASSWORD_CHANGE_REQUIRED;

export type BackendError = {
  code: BackendErrorCode;
  message: string;
  fields?: Record<string, string[]>;
  retryAfterSeconds?: number;
};

export type BackendResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: BackendError };

export type BackendRequest = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  json?: unknown;
  form?: FormData;
  token?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type BackendClient = {
  request<T>(path: string, init?: BackendRequest): Promise<BackendResult<T>>;
};

export type BackendClientOptions = {
  baseUrl: string;
  serviceKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

export const DEFAULT_TIMEOUT_MS = 10_000;
export const CLIENT_IP_HEADER = "x-client-ip";

export type EncodedForm = { bytes: ArrayBuffer; contentType: string };

export async function encodeForm(form: FormData): Promise<EncodedForm> {
  const encoded = new Response(form);
  return { bytes: await encoded.arrayBuffer(), contentType: encoded.headers.get("content-type") ?? "multipart/form-data" };
}

const knownCodes = new Set<string>([...errorCodes, PASSWORD_CHANGE_REQUIRED]);

function unavailable(message: string): BackendResult<never> {
  return { ok: false, status: 503, error: { code: "unavailable", message } };
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function readFields(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(value)) {
    if (Array.isArray(messages)) {
      fields[key] = messages.filter((message): message is string => typeof message === "string");
    }
  }
  return fields;
}

export function parseErrorBody(body: unknown, status: number): BackendError {
  const error =
    body && typeof body === "object" && "error" in body
      ? (body as { error: unknown }).error
      : null;
  if (!error || typeof error !== "object") {
    return {
      code: status === 502 || status === 503 || status === 504 ? "unavailable" : "internal",
      message: "The server returned an unexpected response",
    };
  }
  const raw = error as Record<string, unknown>;
  const code =
    typeof raw.code === "string" && knownCodes.has(raw.code)
      ? (raw.code as BackendErrorCode)
      : "internal";
  const parsed: BackendError = {
    code,
    message: typeof raw.message === "string" ? raw.message : "Something went wrong",
  };
  const fields = readFields(raw.fields);
  if (fields) parsed.fields = fields;
  if (typeof raw.retryAfterSeconds === "number") parsed.retryAfterSeconds = raw.retryAfterSeconds;
  return parsed;
}

export function backendEndpoint(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ""), base).href;
}

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function createBackendClient(options: BackendClientOptions): BackendClient {
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async request<T>(path: string, init: BackendRequest = {}): Promise<BackendResult<T>> {
      const form = init.form ? await encodeForm(init.form) : null;
      const headers = new Headers({
        accept: "application/json",
        "x-service-key": options.serviceKey,
      });
      if (init.json !== undefined) headers.set("content-type", "application/json");
      if (form) headers.set("content-type", form.contentType);
      if (init.token) headers.set("authorization", `Bearer ${init.token}`);
      if (init.ip) {
        headers.set("x-forwarded-for", init.ip);
        headers.set(CLIENT_IP_HEADER, init.ip);
      }
      if (init.userAgent) headers.set("x-client-user-agent", init.userAgent.slice(0, 512));

      let response: Response;
      let text: string;
      try {
        response = await doFetch(backendEndpoint(options.baseUrl, path), {
          method: init.method ?? "GET",
          headers,
          body: form ? form.bytes : init.json === undefined ? undefined : JSON.stringify(init.json),
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(timeoutMs),
        });
        text = await response.text();
      } catch (error) {
        return unavailable(
          isAbort(error)
            ? "The server took too long to respond. Please try again."
            : "Could not reach the server. Please try again.",
        );
      }

      const body = parseJson(text);

      if (response.ok) {
        return { ok: true, status: response.status, data: body as T };
      }

      return { ok: false, status: response.status, error: parseErrorBody(body, response.status) };
    },
  };
}
