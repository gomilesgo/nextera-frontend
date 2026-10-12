import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { FlagsTable } from "@/components/payments/FlagsTable";
import { StatusTabs } from "@/components/review/StatusTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadFlags } from "@/lib/payments/api";
import { FLAG_PAGE_SIZE, flagTabs, parseFlagState } from "@/lib/payments/filters";
import { paymentQueries } from "@/lib/queries/payments";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Payment flags" };

export default async function PaymentFlagsPage({ searchParams }: PageProps<"/payment-flags">) {
  const { token } = await requirePermission("payments.view");
  const state = parseFlagState(await searchParams);
  const query = { state, limit: FLAG_PAGE_SIZE };

  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery({ ...paymentQueries.flagList(query), queryFn: () => loadFlags(token, query) });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Money"
        title="Payment flags"
        description="Payments the platform refused to activate automatically. Settle each one in Cashfree or the ledger, then record how it was resolved."
      />
      <StatusTabs label="Flag state" basePath="/payment-flags" options={flagTabs} current={state} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <FlagsTable key={state} state={state} />
      </HydrationBoundary>
    </div>
  );
}
