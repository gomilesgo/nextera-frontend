import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { PaymentStatusView } from "@/components/invest/PaymentStatusView";
import { loadPaymentStatus } from "@/lib/queries/investmentLoaders";
import { paymentStatusQuery } from "@/lib/queries/investments";
import { getServerQueryClient } from "@/lib/queries/server";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Payment status" };

export default async function PaymentStatusPage({ params }: PageProps<"/portal/invest/[id]/status">) {
  const { token } = await requireCustomer();
  const { id } = await params;
  let data: Awaited<ReturnType<typeof loadPaymentStatus>> | undefined;
  try {
    data = await loadPaymentStatus(token, id);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[payment status] prefetch failed:", error instanceof Error ? error.message : error);
  }
  if (data === null) notFound();

  const queryClient = getServerQueryClient();
  if (data) queryClient.setQueryData(paymentStatusQuery(id, { startedAt: 0 }).queryKey, data);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PaymentStatusView investmentId={id} />
    </HydrationBoundary>
  );
}
