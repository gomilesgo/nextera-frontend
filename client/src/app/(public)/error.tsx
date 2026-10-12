"use client";

import { ErrorPanel } from "@/components/errors/ErrorPanel";

export default function PublicError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="pt-24">
      <ErrorPanel
        error={error}
        retry={retry}
        scope="public"
        title="This page did not load."
        body="Please try again in a moment. If it keeps happening, you can still reach us by email."
      />
    </div>
  );
}
