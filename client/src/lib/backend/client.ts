import "server-only";
import { isIP } from "node:net";
import { errorCodes } from "@nextera/contracts";
import type { ErrorCode } from "@nextera/contracts";

export type BackendErrorCode = ErrorCode | "unavailable";

export type BackendError = {
  code: BackendErrorCode;
  message: string;
  fields?: Record<string, string[]>;
  retryAfterSeconds?: number;
};

export type BackendBinary = {
  bytes: Uint8Array<ArrayBuffer>;
  headers: Headers;
};

export type BackendResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: BackendError };

export type BackendRequest = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  json?: unknown;
  form?: FormData;
  binary?: boolean;
  maxBytes?: number;
  token?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  revalidateSeconds?: number;
  headers?: Record<string, string>;
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

const knownCodes = new Set<string>(errorCodes);

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
      ? (raw.code as ErrorCode)
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

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function cacheOptions(revalidateSeconds: number | undefined): RequestInit {
  if (revalidateSeconds === undefined || revalidateSeconds <= 0) return { cache: "no-store" };
  return { next: { revalidate: revalidateSeconds } };
}

const TOO_LARGE: BackendResult<never> = {
  ok: false,
  status: 502,
  error: { code: "internal", message: "The server returned a file that is too large" },
};

async function readBytes(response: Response, maxBytes: number | undefined): Promise<Uint8Array<ArrayBuffer> | null> {
  if (maxBytes === undefined) return new Uint8Array(await response.arrayBuffer());
  const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) {
    await response.body?.cancel();
    return null;
  }
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function requestBody(init: BackendRequest): BodyInit | undefined {
  if (init.form) return init.form;
  return init.json === undefined ? undefined : JSON.stringify(init.json);
}

export function createBackendClient(options: BackendClientOptions): BackendClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async request<T>(path: string, init: BackendRequest = {}): Promise<BackendResult<T>> {
      const headers = new Headers({
        accept: "application/json",
        "x-service-key": options.serviceKey,
      });
      if (init.json !== undefined) headers.set("content-type", "application/json");
      if (init.token) headers.set("authorization", `Bearer ${init.token}`);
      if (init.ip && isIP(init.ip.trim())) {
        headers.set("x-forwarded-for", init.ip.trim());
        headers.set("x-client-ip", init.ip.trim());
      }
      if (init.userAgent) headers.set("x-client-user-agent", init.userAgent.slice(0, 512));
      if (init.headers) {
        for (const [key, value] of Object.entries(init.headers)) {
          headers.set(key, value);
        }
      }

      let response: Response;
      let text: string;
      try {
        response = await doFetch(`${baseUrl}${path}`, {
          method: init.method ?? "GET",
          headers,
          body: requestBody(init),
          ...cacheOptions(init.revalidateSeconds),
          redirect: "error",
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (init.binary && response.ok) {
          const bytes = await readBytes(response, init.maxBytes);
          if (!bytes) return TOO_LARGE;
          const binary: BackendBinary = { bytes, headers: response.headers };
          return { ok: true, status: response.status, data: binary as T };
        }
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
