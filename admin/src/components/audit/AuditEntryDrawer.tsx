"use client";

import Link from "next/link";
import type { AuditLogDetail } from "@nextera/contracts";
import { Dialog } from "@/components/ui/Dialog";
import { Notice } from "@/components/ui/Notice";
import { diffJson, prettyJson } from "@/lib/audit/diff";
import type { DiffKind } from "@/lib/audit/diff";
import { auditActorLabels, entityHref } from "@/lib/audit/labels";
import { useAuditEntry } from "@/lib/customers/hooks";
import { formatDateTime } from "@/lib/format";
import { cx } from "@/lib/cx";

const kindLabels: Record<DiffKind, string> = {
  added: "Added",
  removed: "Removed",
  changed: "Changed",
  unchanged: "Same",
};

const kindTones: Record<DiffKind, string> = {
  added: "text-moss",
  removed: "text-ember",
  changed: "text-gold",
  unchanged: "text-dust",
};

export function AuditEntryDrawer({ entryId, onClose }: { entryId: string | undefined; onClose: () => void }) {
  return (
    <Dialog variant="drawer" open={Boolean(entryId)} onClose={onClose} title="Audit entry" closeButton backdropClose>
      {entryId ? <AuditEntryBody entryId={entryId} /> : null}
    </Dialog>
  );
}

function AuditEntryBody({ entryId }: { entryId: string }) {
  const { data, error, isPending } = useAuditEntry(entryId);
  if (isPending) {
    return (
      <p role="status" className="text-sm text-dust">
        Loading entry…
      </p>
    );
  }
  if (!data) return <Notice tone="error">{error?.message ?? "Audit entry not found"}</Notice>;
  return <AuditEntryDetail entry={data.entry} />;
}

function AuditEntryDetail({ entry }: { entry: AuditLogDetail }) {
  const lines = diffJson(entry.before, entry.after);
  const changes = lines.filter((line) => line.kind !== "unchanged");
  const href = entityHref(entry.entity, entry.entityId);

  return (
    <div className="grid gap-5">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-dust">Action</dt>
          <dd className="font-mono">{entry.action}</dd>
        </div>
        <div>
          <dt className="text-xs text-dust">When</dt>
          <dd>{formatDateTime(entry.at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-dust">Actor</dt>
          <dd>
            {auditActorLabels[entry.actorType]}
            {entry.actorName ? ` · ${entry.actorName}` : ""}
            {entry.actorId ? <div className="font-mono text-xs break-all text-dust">{entry.actorId}</div> : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-dust">Entity</dt>
          <dd>
            <span className="font-mono">{entry.entity}</span>
            {entry.entityId ? (
              <div className="font-mono text-xs break-all text-dust">
                {href ? (
                  <Link href={href} className="hover:text-gold">
                    {entry.entityId}
                  </Link>
                ) : (
                  entry.entityId
                )}
              </div>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-dust">IP address</dt>
          <dd className="font-mono">{entry.ip ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-dust">Entry ID</dt>
          <dd className="font-mono text-xs break-all">{entry.id}</dd>
        </div>
      </dl>

      <section aria-labelledby="audit-changes" className="grid gap-2">
        <h3 id="audit-changes" className="eyebrow">
          Changes
        </h3>
        {changes.length === 0 ? (
          <p className="text-sm text-dust">No field-level changes were recorded.</p>
        ) : (
          <div className="hairline overflow-x-auto rounded-[3px]">
            <table className="data-table">
              <caption className="sr-only">Field changes between before and after</caption>
              <thead>
                <tr>
                  <th scope="col">Field</th>
                  <th scope="col">Change</th>
                  <th scope="col">Before</th>
                  <th scope="col">After</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((line) => (
                  <tr key={line.path}>
                    <td className="font-mono text-xs break-all">{line.path}</td>
                    <td className={cx("text-xs", kindTones[line.kind])}>{kindLabels[line.kind]}</td>
                    <td className="max-w-56 font-mono text-xs break-all text-dust">{line.before ?? "—"}</td>
                    <td className="max-w-56 font-mono text-xs break-all">{line.after ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <JsonBlock label="Before" value={entry.before} />
        <JsonBlock label="After" value={entry.after} />
      </div>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <figure className="grid min-w-0 content-start gap-1.5">
      <figcaption className="eyebrow">{label}</figcaption>
      <pre className="hairline max-h-80 overflow-auto rounded-[3px] bg-inkwell p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
        {prettyJson(value)}
      </pre>
    </figure>
  );
}
