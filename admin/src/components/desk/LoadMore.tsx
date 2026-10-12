"use client";

import { Button } from "@/components/ui/Button";

export function LoadMore({
  count,
  hasMore,
  loading,
  onMore,
  noun,
}: {
  count: number;
  hasMore: boolean;
  loading: boolean;
  onMore: () => void;
  noun: { one: string; many: string };
}) {
  return (
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-xs text-dust">
      <p aria-live="polite">
        {`Showing ${count} ${count === 1 ? noun.one : noun.many}${hasMore ? "" : count > 0 ? ", that is all of them" : ""}.`}
      </p>
      {hasMore ? (
        <Button variant="secondary" size="sm" onClick={onMore} disabled={loading} aria-busy={loading}>
          {loading ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
