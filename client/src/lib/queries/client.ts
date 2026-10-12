import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { authLossReason, shouldRetryRead } from "@/lib/api/errors";

export const DEFAULT_STALE_MS = 60_000;

export type AuthLostHandler = (client: QueryClient, reason: "session" | "blocked") => void;

export type QueryClientOptions = { server?: boolean; onAuthLost?: AuthLostHandler };

export function makeQueryClient(options: QueryClientOptions = {}): QueryClient {
  const handle = (error: unknown) => {
    const reason = authLossReason(error);
    if (reason) options.onAuthLost?.(client, reason);
  };
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handle }),
    mutationCache: new MutationCache({ onError: handle }),
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_MS,
        retry: options.server ? false : shouldRetryRead,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return client;
}
