"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BankDecisionActions } from "@/components/bank/BankDecisionActions";
import { BankStatusBadge } from "@/components/bank/BankStatusBadge";
import { NameMatch } from "@/components/bank/NameMatch";
import { QueueFooter } from "@/components/review/QueueFooter";
import { Notice } from "@/components/ui/Notice";
import type { BankQueueStatus } from "@/lib/bank/labels";
import { holdLabel } from "@/lib/bank/labels";
import { formatDateTime } from "@/lib/format";
import { bankQueries } from "@/lib/queries/options";
import { QUEUE_PAGE_SIZE, nextLimit } from "@/lib/queue";

const emptyMessages: Record<BankQueueStatus, string> = {
  review: "No bank accounts are held for review.",
  verified: "No bank accounts have been verified yet.",
  rejected: "No bank accounts have been rejected.",
};

export function BankQueueTable({ status, canReview }: { status: BankQueueStatus; canReview: boolean }) {
  const [limit, setLimit] = useState(QUEUE_PAGE_SIZE);
  const { data, error, isPending, isFetching, isPlaceholderData } = useQuery(bankQueries.queue({ status, limit }));
  const showActions = canReview && status === "review";

  if (isPending) return <p className="text-sm text-dust">Loading bank accounts…</p>;
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
              <th>Account</th>
              <th>Name on KYC</th>
              <th>Name at bank</th>
              <th>Name match</th>
              <th>Status</th>
              <th>{status === "rejected" ? "Reason" : "Note"}</th>
              <th>Added</th>
              {showActions ? <th className="num">Decision</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((account) => (
              <tr key={account.id}>
                <td>
                  <span className="font-mono">{account.accountMasked}</span>
                  <div className="font-mono text-xs text-dust">{account.ifsc}</div>
                  <Link href={`/kyc/${account.customerId}`} className="text-xs text-gold hover:underline">
                    Customer KYC
                  </Link>
                </td>
                <td>{account.holderName}</td>
                <td>{account.nameAtBank ?? "—"}</td>
                <td>
                  <NameMatch result={account.nameMatchResult} score={account.nameMatchScore} />
                </td>
                <td>
                  <BankStatusBadge status={account.status} />
                </td>
                <td className="max-w-64 text-dust">
                  {account.status === "review" ? holdLabel(account.holdReason) : (account.reviewNote ?? "—")}
                </td>
                <td className="whitespace-nowrap text-dust">{formatDateTime(account.createdAt)}</td>
                {showActions ? (
                  <td className="text-right">
                    <BankDecisionActions account={account} />
                  </td>
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
        noun={{ one: "account", many: "accounts" }}
      />
      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}
    </div>
  );
}
