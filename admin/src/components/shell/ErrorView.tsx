"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";

export function ErrorView({ digest, retry }: { digest?: string; retry: () => void }) {
  return (
    <div className="grid max-w-xl gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <Notice tone="error">
        The console could not load this page. The backend may be unavailable.
        {digest ? <span className="ml-1 font-mono text-xs text-dust">({digest})</span> : null}
      </Notice>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => retry()}>
          Try again
        </Button>
        <ButtonLink href="/login" variant="ghost">
          Back to sign in
        </ButtonLink>
      </div>
    </div>
  );
}
