"use client";

import { AuditEntryDrawer } from "@/components/audit/AuditEntryDrawer";
import { AuditFiltersForm } from "@/components/audit/AuditFiltersForm";
import { Pagination } from "@/components/listing/Pagination";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { auditFiltersSearch, hasAuditFilters, parseAuditEntryId, parseAuditFilters } from "@/lib/audit/filters";
import type { AuditFilters } from "@/lib/audit/filters";
import { auditActorLabels } from "@/lib/audit/labels";
import { useAuditLog, useUrlState } from "@/lib/customers/hooks";
import { formatDateTime, shortId } from "@/lib/format";

function parseAuditState(params: URLSearchParams) {
  return { filters: parseAuditFilters(params), entryId: parseAuditEntryId(params) };
}

export function AuditView() {
  const { value, navigate } = useUrlState(parseAuditState);
  const { filters, entryId } = value;
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useAuditLog(filters);
  const filterSearch = auditFiltersSearch(filters);

  function apply(next: AuditFilters) {
    navigate(auditFiltersSearch({ ...next, offset: 0 }));
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Compliance"
        title="Audit log"
        description="Every staff write, sign-in and money adjustment, newest first. Open an entry to compare before and after."
      />

      <AuditFiltersForm key={filterSearch} filters={filters} onApply={apply} onClear={() => navigate("")} />

      {error && !data ? (
        <Notice tone="error">
          <span className="flex flex-wrap items-center justify-between gap-2">
            {error.message}
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          </span>
        </Notice>
      ) : null}

      <div className="grid gap-2">
        <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
          <table className="data-table">
            <caption className="sr-only">Audit log entries</caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Actor</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">IP</th>
                <th scope="col" className="num">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
              {isPending ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-dust">
                    Loading audit log…
                  </td>
                </tr>
              ) : data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-dust">
                    {hasAuditFilters(filters) ? "No entries match these filters." : "No audit entries yet."}
                  </td>
                </tr>
              ) : (
                data?.items.map((entry) => (
                  <tr key={entry.id} className={entry.id === entryId ? "bg-ink" : undefined}>
                    <td className="whitespace-nowrap text-dust">{formatDateTime(entry.at)}</td>
                    <td>
                      {entry.actorName ?? auditActorLabels[entry.actorType]}
                      {entry.actorId ? (
                        <div className="font-mono text-xs text-dust" title={entry.actorId}>
                          {entry.actorName ? auditActorLabels[entry.actorType] : shortId(entry.actorId)}
                        </div>
                      ) : null}
                    </td>
                    <td className="font-mono text-xs whitespace-nowrap">{entry.action}</td>
                    <td>
                      <span className="font-mono text-xs">{entry.entity}</span>
                      {entry.entityId ? (
                        <div className="font-mono text-xs text-dust" title={entry.entityId}>
                          {shortId(entry.entityId)}
                        </div>
                      ) : null}
                    </td>
                    <td className="font-mono text-xs whitespace-nowrap text-dust">{entry.ip ?? "—"}</td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(auditFiltersSearch(filters, entry.id))}
                        aria-label={`View ${entry.action} at ${formatDateTime(entry.at)}`}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          label="Audit entries"
          window={filters}
          total={data?.total ?? 0}
          busy={isFetching}
          onOffset={(offset) => navigate(auditFiltersSearch({ ...filters, offset }))}
        />
        <p aria-live="polite" className="min-h-4 text-xs text-ember">
          {error && data ? `Showing earlier results: ${error.message}` : ""}
        </p>
      </div>

      <AuditEntryDrawer entryId={entryId} onClose={() => navigate(filterSearch)} />
    </div>
  );
}
