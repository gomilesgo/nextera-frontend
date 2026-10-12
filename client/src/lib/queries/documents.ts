import { queryOptions } from "@tanstack/react-query";
import type { InvestmentDocument } from "@nextera/contracts";
import { fetchApi } from "./fetchApi";
import { queryKeys } from "./keys";

export type DocumentsData = { documents: InvestmentDocument[] };

type Loader<T> = (signal?: AbortSignal) => Promise<T>;

export const DOCUMENTS_STALE_MS = 60_000;

export function documentsQuery(load: Loader<DocumentsData> = (signal) => fetchApi<DocumentsData>("/api/documents", signal)) {
  return queryOptions({
    queryKey: queryKeys.documents.list(),
    queryFn: ({ signal }) => load(signal),
    staleTime: DOCUMENTS_STALE_MS,
  });
}

export function documentFileUrl(document: Pick<InvestmentDocument, "id">, download = false): string {
  return `/api/documents/${encodeURIComponent(document.id)}/file${download ? "?download=1" : ""}`;
}

export function investmentFileUrl(id: string, kind: "agreement" | "bond", download = false): string {
  return `/api/investments/${encodeURIComponent(id)}/${kind}${download ? "?download=1" : ""}`;
}
