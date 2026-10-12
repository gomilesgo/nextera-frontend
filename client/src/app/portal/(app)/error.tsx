"use client";

import { ErrorPanel } from "@/components/errors/ErrorPanel";

export default function PortalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorPanel
      error={error}
      retry={retry}
      scope="portal"
      title="We could not load this page."
      body="Our systems may be busy. Please try again in a moment; your account and any money with us are not affected."
      homeHref="/portal"
      homeLabel="Back to your dashboard"
    />
  );
}
