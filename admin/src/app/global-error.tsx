"use client";

import { ErrorView } from "@/components/shell/ErrorView";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-inkwell font-sans text-parchment">
        <title>Something went wrong — Nextera Admin</title>
        <meta name="robots" content="noindex, nofollow" />
        <main className="grid min-h-dvh place-items-center px-4 py-12">
          <ErrorView digest={error.digest} retry={retry} />
        </main>
      </body>
    </html>
  );
}
