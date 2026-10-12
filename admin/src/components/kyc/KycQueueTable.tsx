"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { KycStatusBadge } from "@/components/kyc/KycStatusBadge";
import { QueueFooter } from "@/components/review/QueueFooter";
import { Notice } from "@/components/ui/Notice";
import { formatDateTime, formatIsoDate } from "@/lib/format";
import type { KycQueueStatus } from "@/lib/kyc/labels";
import { kycQueries } from "@/lib/queries/options";
import { QUEUE_PAGE_SIZE, nextLimit } from "@/lib/queue";

const emptyMessages: Record<KycQueueStatus, string> = {
  submitted: "No KYC submissions are waiting for review.",
  verified: "No customers have verified KYC yet.",
  rejected: "No KYC submissions have been rejected.",
};

export function KycQueueTable({ status }: { status: KycQueueStatus }) {
  const [limit, setLimit] = useState(QUEUE_PAGE_SIZE);
  const { data, error, isPending, isFetching, isPlaceholderData } = useQuery(kycQueries.queue({ status, limit }));

  if (isPending) return <p className="text-sm text-dust">Loading KYC queue…</p>;
  if (error && !data) return <Notice tone="error">{error.message}</Notice>;

  const items = data?.items ?? [];

  if (items.length === 0) {
    return <div className="hairline rounded-[3px] px-4 py-10 text-center text-sm text-dust">{emptyMessages[status]}</div>;
  }

  return (
    <div className="grid gap-2">
      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Name on PAN</th>
              <th>PAN</th>
              <th>Date of birth</th>
              <th>Status</th>
              <th>Submitted</th>
              {status === "rejected" ? <th>Reason</th> : null}
              {status === "verified" ? <th>Verified</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.customerId}>
                <td>
                  <Link href={`/kyc/${item.customerId}`} className="font-medium hover:text-gold">
                    {item.name ?? "Unnamed customer"}
                  </Link>
                  <div className="font-mono text-xs text-dust">{item.phone}</div>
                </td>
                <td>{item.panName}</td>
                <td className="font-mono">{item.panMasked}</td>
                <td className="whitespace-nowrap">{formatIsoDate(item.dob)}</td>
                <td>
                  <KycStatusBadge status={item.kycStatus} />
                </td>
                <td className="whitespace-nowrap text-dust">{formatDateTime(item.submittedAt)}</td>
                {status === "rejected" ? <td className="max-w-72 text-dust">{item.rejectionReason ?? "—"}</td> : null}
                {status === "verified" ? (
                  <td className="whitespace-nowrap text-dust">{formatDateTime(item.verifiedAt)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <QueueFooter
        count={items.length}
        limit={limit}
        loading={isPlaceholderData}
        onMore={() => setLimit(nextLimit(limit))}
        noun={{ one: "customer", many: "customers" }}
      />
      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}
    </div>
  );
}
