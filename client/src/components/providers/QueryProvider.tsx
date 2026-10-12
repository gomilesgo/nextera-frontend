"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/queries/client";
import { expiredPath } from "@/lib/sessionCookie";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    makeQueryClient({
      onAuthLost: (queryClient, reason) => {
        queryClient.clear();
        window.location.replace(expiredPath(reason, `${window.location.pathname}${window.location.search}`));
      },
    }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
