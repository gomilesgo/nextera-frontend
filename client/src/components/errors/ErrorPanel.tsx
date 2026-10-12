"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

export function ErrorPanel({
  error,
  retry,
  scope,
  title,
  body,
  homeHref = "/",
  homeLabel = "Go to the Nextera home page",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  scope: string;
  title: string;
  body: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  useEffect(() => {
    console.error(`[${scope}]`, error.digest ?? error.message);
  }, [error, scope]);

  return (
    <div className="mx-auto grid max-w-xl gap-6 px-4 py-16 text-center" role="alert">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="text-parchment/75">{body}</p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={() => retry()}>Try again</Button>
        <ButtonLink href={homeHref} variant="ghost">
          {homeLabel}
        </ButtonLink>
      </div>
    </div>
  );
}
