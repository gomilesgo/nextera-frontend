"use client";

import { ErrorPanel } from "@/components/errors/ErrorPanel";

export default function PortalRootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="main" className="flex min-h-svh items-center">
      <ErrorPanel
        error={error}
        retry={retry}
        scope="portal"
        title="We could not load your portal."
        body="Our systems may be busy. Please try again in a moment; your account and any money with us are not affected."
      />
    </main>
  );
}
