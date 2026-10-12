import type { DocumentKind, InvestmentDocument } from "@nextera/contracts";
import { buttonClass } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/datetime";
import { documentFileUrl } from "@/lib/queries/documents";

export const documentKindLabel: Record<DocumentKind, string> = {
  agreement: "Investment agreement",
  bond: "Bond certificate",
  statement: "Statement",
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({
  documents,
  planNames,
}: {
  documents: InvestmentDocument[];
  planNames?: ReadonlyMap<string, string>;
}) {
  return (
    <ul className="grid gap-3">
      {documents.map((document) => {
        const plan = document.investmentId ? planNames?.get(document.investmentId) : undefined;
        const title = documentKindLabel[document.kind];
        return (
          <li
            key={document.id}
            className="hairline flex flex-col gap-4 rounded-[2px] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          >
            <div className="min-w-0">
              <p className="font-medium text-parchment">
                {title}
                {plan ? <span className="text-dust"> · {plan}</span> : null}
              </p>
              <p className="mt-1 text-xs text-dust tnum">
                {document.kind === "agreement" && document.acceptedAt
                  ? `Accepted ${formatDateTime(document.acceptedAt)}`
                  : `Issued ${formatDateTime(document.createdAt)}`}{" "}
                · PDF, {formatFileSize(document.sizeBytes)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <a href={documentFileUrl(document)} target="_blank" rel="noopener" className={buttonClass("ghost", "sm")}>
                View<span className="sr-only"> {title} (opens in a new tab)</span>
              </a>
              <a href={documentFileUrl(document, true)} download className={buttonClass("quiet", "sm")}>
                Download<span className="sr-only"> {title}</span>
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
