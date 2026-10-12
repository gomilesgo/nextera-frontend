import type { InvestmentDocument } from "@nextera/contracts";
import { Section } from "@/components/investments/DetailList";
import { EmptyState } from "@/components/desk/EmptyState";
import { buttonClass } from "@/components/ui/Button";
import { formatBytes, formatDateTime } from "@/lib/format";
import { documentKindLabels } from "@/lib/investments/labels";

export function documentHref(investmentId: string, documentId: string): string {
  return `/api/investments/${encodeURIComponent(investmentId)}/documents/${encodeURIComponent(documentId)}`;
}

export function InvestmentDocuments({
  investmentId,
  documents,
  bondExpected,
}: {
  investmentId: string;
  documents: readonly InvestmentDocument[];
  bondExpected: boolean;
}) {
  const missingBond = bondExpected && !documents.some((document) => document.kind === "bond");
  return (
    <Section id="documents-heading" title="Documents">
      {documents.length === 0 ? (
        <EmptyState>No documents have been issued for this investment.</EmptyState>
      ) : (
        <ul className="hairline divide-y divide-border rounded-[3px]">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{documentKindLabels[document.kind]}</p>
                <p className="truncate font-mono text-xs text-dust" title={document.fileName}>
                  {document.fileName} · {formatBytes(document.sizeBytes)}
                </p>
                <p className="text-xs text-dust">
                  Issued {formatDateTime(document.createdAt)}
                  {document.kind === "agreement"
                    ? document.acceptedAt
                      ? ` · accepted by OTP ${formatDateTime(document.acceptedAt)}`
                      : " · not yet accepted"
                    : null}
                </p>
                <p className="truncate font-mono text-[11px] text-dust/70" title={document.sha256}>
                  SHA-256 {document.sha256}
                </p>
              </div>
              <a
                href={documentHref(investmentId, document.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("secondary", "sm")}
              >
                Open PDF<span className="sr-only">: {documentKindLabels[document.kind]} (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {missingBond ? (
        <p className="text-xs text-dust">
          The bond certificate is generated after activation. If it is missing, the bond-documents job issues it within a few minutes.
        </p>
      ) : null}
    </Section>
  );
}
