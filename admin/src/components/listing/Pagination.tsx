"use client";

import { Button } from "@/components/ui/Button";
import { pageNumbers } from "@/lib/listing/params";
import type { PageWindow } from "@/lib/listing/params";

const count = new Intl.NumberFormat("en-IN");

export function Pagination({
  label,
  window,
  total,
  busy,
  onOffset,
}: {
  label: string;
  window: PageWindow;
  total: number;
  busy?: boolean;
  onOffset: (offset: number) => void;
}) {
  const pages = pageNumbers(window, total);
  return (
    <nav aria-label={`${label} pages`} className="flex min-h-9 flex-wrap items-center justify-between gap-3 text-xs text-dust">
      {pages.pastEnd ? (
        <p aria-live="polite" aria-atomic="true">
          No results on this page.{" "}
          <button
            type="button"
            onClick={() => onOffset(0)}
            disabled={busy}
            className="rounded-[3px] font-medium text-gold underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50"
          >
            Go to the first page
          </button>
        </p>
      ) : (
        <p aria-live="polite" aria-atomic="true">
          {total === 0
            ? `No ${label.toLowerCase()}`
            : `Showing ${count.format(pages.from)}–${count.format(pages.to)} of ${count.format(total)}`}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!pages.hasPrevious || busy}
          onClick={() => onOffset(pages.previousOffset)}
        >
          Previous
        </Button>
        <span className="min-w-20 text-center tabular-nums">
          {pages.pastEnd ? `${pages.pages} ${pages.pages === 1 ? "page" : "pages"}` : `Page ${pages.page} of ${pages.pages}`}
        </span>
        <Button variant="secondary" size="sm" disabled={!pages.hasNext || busy} onClick={() => onOffset(pages.nextOffset)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
