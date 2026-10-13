import "server-only";
import { headers } from "next/headers";
import { parseServerEnv, runtimeServerEnv } from "@/lib/env";
import { clientIp } from "@/lib/request";
import { createBackendClient } from "./client";
import type { BackendClient, BackendRequest, BackendResult } from "./client";

let client: BackendClient | null = null;

function backendClient(): BackendClient | null {
  if (client) return client;
  try {
    const env = parseServerEnv(runtimeServerEnv());
    client = createBackendClient({
      baseUrl: env.NEXTERA_BACKEND_URL,
      serviceKey: env.NEXTERA_PORTAL_SERVICE_KEY,
      timeoutMs: env.NEXTERA_BACKEND_TIMEOUT_MS,
    });
    return client;
  } catch (error) {
    console.error("[backend]", error instanceof Error ? error.message : error);
    return null;
  }
}

const notConfigured: BackendResult<never> = {
  ok: false,
  status: 503,
  error: { code: "unavailable", message: "Nextera is temporarily unavailable. Please try again shortly." },
};

export type VisitorRequest = Omit<BackendRequest, "ip" | "userAgent" | "revalidateSeconds">;

type HeaderSource = { get(name: string): string | null };

export async function callBackendFor<T>(
  source: HeaderSource,
  path: string,
  init: VisitorRequest = {},
): Promise<BackendResult<T>> {
  const backend = backendClient();
  if (!backend) return notConfigured;
  return backend.request<T>(path, {
    ...init,
    ip: clientIp(source),
    userAgent: source.get("user-agent"),
  });
}

export async function callBackend<T>(path: string, init: VisitorRequest = {}): Promise<BackendResult<T>> {
  return callBackendFor<T>(await headers(), path, init);
}

export async function callPublicBackend<T>(path: string, revalidateSeconds: number): Promise<BackendResult<T>> {
  const backend = backendClient();
  if (!backend) return notConfigured;
  return backend.request<T>(path, { revalidateSeconds });
}
