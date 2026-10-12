import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { CustomerLedger } from "@/components/customers/CustomerLedger";
import { loadCustomerLedger } from "@/lib/customers/api";
import { parseLedgerFilters } from "@/lib/customers/filters";
import { isCustomerId } from "@/lib/customers/shape";
import { customerQueries } from "@/lib/queries/customers";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Customer ledger" };

export default async function CustomerLedgerPage({ params, searchParams }: PageProps<"/customers/[id]/ledger">) {
  const { id } = await params;
  const { token } = await requirePermission("customers.view");
  if (!isCustomerId(id)) notFound();
  const filters = parseLedgerFilters(await searchParams);

  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery({
    ...customerQueries.ledger(id, filters),
    queryFn: async () => {
      const page = await loadCustomerLedger(token, id, filters);
      if (!page) notFound();
      return page;
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CustomerLedger customerId={id} />
    </HydrationBoundary>
  );
}
