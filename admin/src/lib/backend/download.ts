import "server-only";
import { headers } from "next/headers";
import { parseServerEnv, runtimeServerEnv } from "@/lib/env";
import { clientIp } from "@/lib/request";
import { backendEndpoint, CLIENT_IP_HEADER, DEFAULT_TIMEOUT_MS, parseErrorBody } from "./client";
import type { BackendError } from "./client";

export type BackendDownload =
  | { ok: true; status: number; body: ReadableStream<Uint8Array> | null; headers: Headers }
  | { ok: false; status: number; error: BackendError };

export type DownloadClientOptions = {
  baseUrl: string;
  serviceKey: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

export type DownloadRequest = {
  token: string;
  accept: string;
  ip?: string | null;
  userAgent?: string | null;
};

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

export function createDownloadClient(options: DownloadClientOptions) {
  const doFetch: typeof fetch = options.fetch ?? ((input, init) => fetch(input, init));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return async function download(path: string, init: DownloadRequest): Promise<BackendDownload> {
    const requestHeaders = new Headers({
      accept: `${init.accept}, application/json`,
      "x-service-key": options.serviceKey,
      authorization: `Bearer ${init.token}`,
    });
    if (init.ip) {
      requestHeaders.set("x-forwarded-for", init.ip);
      requestHeaders.set(CLIENT_IP_HEADER, init.ip);
    }
    if (init.userAgent) requestHeaders.set("x-client-user-agent", init.userAgent.slice(0, 512));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), timeoutMs);
    let response: Response;
    try {
      response = await doFetch(backendEndpoint(options.baseUrl, path), {
        method: "GET",
        headers: requestHeaders,
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
      });
    } catch (error) {
      return {
        ok: false,
        status: 503,
        error: {
          code: "unavailable",
          message: isTimeout(error)
            ? "The server took too long to respond. Please try again."
            : "Could not reach the server. Please try again.",
        },
      };
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, status: response.status, error: parseErrorBody(parseJson(text), response.status) };
    }
    return { ok: true, status: response.status, body: response.body, headers: response.headers };
  };
}

let client: ReturnType<typeof createDownloadClient> | null = null;

export async function downloadFromBackend(
  path: string,
  init: Omit<DownloadRequest, "ip" | "userAgent">,
): Promise<BackendDownload> {
  if (!client) {
    const env = parseServerEnv(runtimeServerEnv());
    client = createDownloadClient({
      baseUrl: env.NEXTERA_BACKEND_URL,
      serviceKey: env.NEXTERA_ADMIN_SERVICE_KEY,
      timeoutMs: env.NEXTERA_BACKEND_TIMEOUT_MS,
    });
  }
  const incoming = await headers();
  return client(path, { ...init, ip: clientIp(incoming), userAgent: incoming.get("user-agent") });
}
