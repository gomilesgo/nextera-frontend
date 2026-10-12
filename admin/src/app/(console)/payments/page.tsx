import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { PaymentsTable } from "@/components/payments/PaymentsTable";
import { StatusTabs } from "@/components/review/StatusTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadPayments } from "@/lib/payments/api";
import { PAYMENT_PAGE_SIZE, parsePaymentTab, paymentTabs, tabStatus } from "@/lib/payments/filters";
import { paymentQueries } from "@/lib/queries/payments";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const { token } = await requirePermission("payments.view");
  const tab = parsePaymentTab(await searchParams);
  const query = { status: tabStatus(tab), limit: PAYMENT_PAGE_SIZE };

  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery({ ...paymentQueries.list(query), queryFn: () => loadPayments(token, query) });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Money"
        title="Payments"
        description="Cashfree checkout attempts. An investment activates only after the server confirms the order with Cashfree, from the webhook or the reconcile job."
      />
      <StatusTabs label="Payment status" basePath="/payments" options={paymentTabs} current={tab} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PaymentsTable key={tab} tab={tab} />
      </HydrationBoundary>
    </div>
  );
}
