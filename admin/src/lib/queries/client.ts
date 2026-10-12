import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isUnauthorized, needsPasswordChange, shouldRetry } from "./options";

export type SessionRedirects = {
  onUnauthorized?: () => void;
  onPasswordChangeRequired?: () => void;
};

export function makeQueryClient({ onUnauthorized, onPasswordChangeRequired }: SessionRedirects = {}): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (onUnauthorized && isUnauthorized(error)) {
          client.clear();
          onUnauthorized();
          return;
        }
        if (onPasswordChangeRequired && needsPasswordChange(error)) onPasswordChangeRequired();
      },
    }),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return client;
}

export function makeServerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: false },
      mutations: { retry: false },
    },
  });
}
