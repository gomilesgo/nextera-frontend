"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/queries/client";
import { EXPIRED_PATH, LOGIN_PATH, PASSWORD_PATH } from "@/lib/sessionCookie";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    makeQueryClient({
      onUnauthorized: () => {
        if (window.location.pathname === LOGIN_PATH) return;
        window.location.assign(EXPIRED_PATH);
      },
      onPasswordChangeRequired: () => {
        if (window.location.pathname === PASSWORD_PATH) return;
        window.location.assign(PASSWORD_PATH);
      },
    }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
