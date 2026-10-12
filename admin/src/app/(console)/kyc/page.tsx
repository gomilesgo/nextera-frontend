import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { kycQueueStatuses } from "@nextera/contracts";
import { KycQueueTable } from "@/components/kyc/KycQueueTable";
import { StatusTabs } from "@/components/review/StatusTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadKycQueue } from "@/lib/kyc/api";
import { kycQueueTabs } from "@/lib/kyc/labels";
import { kycQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { QUEUE_PAGE_SIZE, pickStatus } from "@/lib/queue";
import { firstParam } from "@/lib/request";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "KYC" };

export default async function KycQueuePage({ searchParams }: PageProps<"/kyc">) {
  const { token } = await requirePermission("kyc.view");
  const status = pickStatus(kycQueueStatuses, firstParam((await searchParams).status), "submitted");
  const query = { status, limit: QUEUE_PAGE_SIZE };

  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery({ ...kycQueries.queue(query), queryFn: () => loadKycQueue(token, query) });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Compliance"
        title="KYC"
        description="Customers must have verified KYC before they can add a bank account or invest."
      />
      <StatusTabs label="KYC status" basePath="/kyc" options={kycQueueTabs} current={status} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <KycQueueTable key={status} status={status} />
      </HydrationBoundary>
    </div>
  );
}
