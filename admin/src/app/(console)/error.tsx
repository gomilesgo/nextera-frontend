"use client";

import { ErrorView } from "@/components/shell/ErrorView";

export default function ConsoleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorView digest={error.digest} retry={retry} />;
}
