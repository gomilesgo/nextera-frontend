import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { FlagDetail } from "@/components/payments/FlagDetail";
import { loadFlagDetail } from "@/lib/payments/api";
import { can } from "@/lib/permissions";
import { paymentQueries } from "@/lib/queries/payments";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";
import { isUuid } from "@/lib/shape";

export const metadata: Metadata = { title: "Payment flag" };

export default async function PaymentFlagPage({ params }: PageProps<"/payment-flags/[id]">) {
  const id = (await params).id.toLowerCase();
  const { staff, token } = await requirePermission("payments.view");
  if (!isUuid(id)) notFound();
  const detail = await loadFlagDetail(token, id);
  if (!detail) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(paymentQueries.flag(id).queryKey, detail);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FlagDetail flagId={id} canResolve={can(staff.role, "payments.resolve")} />
    </HydrationBoundary>
  );
}
