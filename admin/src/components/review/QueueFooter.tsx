"use client";

import { Button } from "@/components/ui/Button";
import { QUEUE_MAX_LIMIT, hasMore } from "@/lib/queue";

export function QueueFooter({
  count,
  limit,
  loading,
  onMore,
  noun,
}: {
  count: number;
  limit: number;
  loading: boolean;
  onMore: () => void;
  noun: { one: string; many: string };
}) {
  const more = hasMore(count, limit);
  const capped = count >= QUEUE_MAX_LIMIT;
  return (
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-xs text-dust">
      <p aria-live="polite">
        {capped
          ? `Showing the oldest ${QUEUE_MAX_LIMIT} ${noun.many}. Review these to see more.`
          : `Showing ${count} ${count === 1 ? noun.one : noun.many}, oldest first.`}
      </p>
      {more ? (
        <Button variant="secondary" size="sm" onClick={onMore} disabled={loading} aria-busy={loading}>
          {loading ? "Loading…" : "Show more"}
        </Button>
      ) : null}
    </div>
  );
}
