import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { DocumentsView } from "@/components/documents/DocumentsView";
import { documentsQuery } from "@/lib/queries/documents";
import { loadDocuments, loadInvestments } from "@/lib/queries/investmentLoaders";
import { investmentsQuery } from "@/lib/queries/investments";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const { token } = await requireCustomer();
  const queryClient = getServerQueryClient();
  const [documents, investments] = await Promise.all([loadDocuments(token), loadInvestments(token)]);
  queryClient.setQueryData(documentsQuery().queryKey, documents);
  queryClient.setQueryData(investmentsQuery().queryKey, investments);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DocumentsView />
    </HydrationBoundary>
  );
}
