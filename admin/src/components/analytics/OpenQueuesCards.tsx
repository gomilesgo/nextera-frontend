import Link from "next/link";
import type { AnalyticsOpenQueues } from "@nextera/contracts";

function QueueCard({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="hairline flex items-center justify-between rounded-[3px] bg-horizon/60 px-4 py-3 hover:bg-ink"
    >
      <span className="text-sm">{label}</span>
      <span
        className={`font-mono text-sm font-medium ${count > 0 ? "text-gold" : "text-dust"}`}
        aria-label={`${count} ${count === 1 ? "item" : "items"}`}
      >
        {count}
      </span>
    </Link>
  );
}

export function OpenQueuesCards({ queues }: { queues: AnalyticsOpenQueues }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <QueueCard label="KYC pending" count={queues.kycPending} href="/kyc" />
      <QueueCard label="Bank accounts in review" count={queues.bankReviewPending} href="/bank-accounts" />
      <QueueCard
        label="Withdrawals requested"
        count={queues.withdrawalsRequested}
        href="/withdrawals"
      />
      <QueueCard
        label="Withdrawals approved"
        count={queues.withdrawalsApproved}
        href="/withdrawals"
      />
      <QueueCard
        label="Withdrawals needing review"
        count={queues.withdrawalsNeedsReview}
        href="/withdrawals"
      />
      <QueueCard label="Support tickets open" count={queues.supportOpen} href="/support" />
      <QueueCard
        label="Support pending customer"
        count={queues.supportPendingCustomer}
        href="/support"
      />
      <QueueCard label="Payment flags open" count={queues.paymentFlagsOpen} href="/payment-flags" />
    </div>
  );
}
