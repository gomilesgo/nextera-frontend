import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { KycReview } from "@/components/kyc/KycReview";
import { loadCustomerKyc } from "@/lib/kyc/api";
import { can } from "@/lib/permissions";
import { kycQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { requirePermission } from "@/lib/session";
import { isUuid } from "@/lib/shape";

export const metadata: Metadata = { title: "KYC review" };

export default async function KycReviewPage({ params }: PageProps<"/kyc/[customerId]">) {
  const { customerId } = await params;
  const { staff, token } = await requirePermission("customers.view");
  if (!isUuid(customerId)) notFound();
  const detail = await loadCustomerKyc(token, customerId);
  if (!detail) notFound();

  const queryClient = getServerQueryClient();
  queryClient.setQueryData(kycQueries.customer(customerId).queryKey, detail);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <KycReview
        customerId={customerId}
        canReview={can(staff.role, "kyc.review")}
        canReviewBank={can(staff.role, "bank.review")}
      />
    </HydrationBoundary>
  );
}
