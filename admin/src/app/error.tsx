"use client";

import { ErrorView } from "@/components/shell/ErrorView";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <ErrorView digest={error.digest} retry={retry} />
    </main>
  );
}
