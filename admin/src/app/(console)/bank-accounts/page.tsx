import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { BankQueueTable } from "@/components/bank/BankQueueTable";
import { StatusTabs } from "@/components/review/StatusTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadBankQueue } from "@/lib/bank/api";
import { bankQueueStatuses, bankQueueTabs } from "@/lib/bank/labels";
import { can } from "@/lib/permissions";
import { bankQueries } from "@/lib/queries/options";
import { getServerQueryClient } from "@/lib/queries/server";
import { QUEUE_PAGE_SIZE, pickStatus } from "@/lib/queue";
import { firstParam } from "@/lib/request";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Bank review" };

export default async function BankReviewPage({ searchParams }: PageProps<"/bank-accounts">) {
  const { staff, token } = await requirePermission("bank.review");
  const status = pickStatus(bankQueueStatuses, firstParam((await searchParams).status), "review");
  const query = { status, limit: QUEUE_PAGE_SIZE };

  const queryClient = getServerQueryClient();
  await queryClient.fetchQuery({ ...bankQueries.queue(query), queryFn: () => loadBankQueue(token, query) });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Compliance"
        title="Bank review"
        description="Accounts whose penny-drop name match was weak, or that were held after a KYC change. Compare the name at the bank with the KYC name before approving."
      />
      <StatusTabs label="Bank account status" basePath="/bank-accounts" options={bankQueueTabs} current={status} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <BankQueueTable key={status} status={status} canReview={can(staff.role, "bank.review")} />
      </HydrationBoundary>
    </div>
  );
}
