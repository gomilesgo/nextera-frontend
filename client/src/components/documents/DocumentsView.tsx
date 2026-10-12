"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DocumentList } from "@/components/investments/DocumentList";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { documentsQuery } from "@/lib/queries/documents";
import { investmentsQuery } from "@/lib/queries/investments";

export function DocumentsView() {
  const documents = useQuery(documentsQuery());
  const investments = useQuery(investmentsQuery());
  const planNames = useMemo(
    () => new Map((investments.data?.investments ?? []).map((investment) => [investment.id, investment.planName])),
    [investments.data],
  );

  return (
    <div className="grid gap-10">
      <header>
        <p className="eyebrow">Documents</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">Your documents</h1>
        <p className="mt-3 max-w-2xl text-parchment/75">
          Agreements you accepted and bond certificates for your investments. Keep a copy for your records.
        </p>
      </header>

      {documents.isPending ? (
        <p className="min-h-[16rem] text-dust" role="status">
          Loading your documents…
        </p>
      ) : documents.isError ? (
        <Notice tone="error" title="We could not load your documents">
          <span className="block">{documents.error.message}</span>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => documents.refetch()} disabled={documents.isFetching}>
            {documents.isFetching ? "Retrying…" : "Try again"}
          </Button>
        </Notice>
      ) : documents.data.documents.length === 0 ? (
        <section className="hairline grid justify-items-start gap-4 rounded-[2px] p-8">
          <h2 className="font-display text-2xl">No documents yet</h2>
          <p className="max-w-xl text-parchment/75">
            Your agreement appears here when you start an investment, and your bond certificate once it is paid.
          </p>
          <ButtonLink href="/portal/plans">See open plans</ButtonLink>
        </section>
      ) : (
        <DocumentList documents={documents.data.documents} planNames={planNames} />
      )}
    </div>
  );
}
