import "server-only";
import { headers } from "next/headers";
import { parseServerEnv, runtimeServerEnv } from "@/lib/env";
import { clientIp } from "@/lib/request";
import { createBackendClient } from "./client";
import type { BackendClient, BackendRequest, BackendResult } from "./client";

let client: BackendClient | null = null;

function backendClient(): BackendClient {
  if (!client) {
    const env = parseServerEnv(runtimeServerEnv());
    client = createBackendClient({
      baseUrl: env.NEXTERA_BACKEND_URL,
      serviceKey: env.NEXTERA_ADMIN_SERVICE_KEY,
      timeoutMs: env.NEXTERA_BACKEND_TIMEOUT_MS,
    });
  }
  return client;
}

export async function callBackend<T>(
  path: string,
  init: Omit<BackendRequest, "ip" | "userAgent"> = {},
): Promise<BackendResult<T>> {
  const incoming = await headers();
  return backendClient().request<T>(path, {
    ...init,
    ip: clientIp(incoming),
    userAgent: incoming.get("user-agent"),
  });
}
