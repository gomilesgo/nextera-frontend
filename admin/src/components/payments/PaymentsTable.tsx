"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import { CustomerLink } from "@/components/payments/CustomerLink";
import { EmptyState } from "@/components/desk/EmptyState";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { formatDateTime, shortId } from "@/lib/format";
import { PAYMENT_MAX_LIMIT, PAYMENT_PAGE_SIZE, hasMorePayments, nextPaymentLimit, tabStatus } from "@/lib/payments/filters";
import type { PaymentTab } from "@/lib/payments/filters";
import { activationSourceLabels, flagReasonLabels, paymentStatusLabels } from "@/lib/payments/labels";
import { paymentQueries } from "@/lib/queries/payments";

export function PaymentsTable({ tab }: { tab: PaymentTab }) {
  const [limit, setLimit] = useState(PAYMENT_PAGE_SIZE);
  const status = tabStatus(tab);
  const { data, error, isPending, isFetching, isPlaceholderData } = useQuery(paymentQueries.list({ status, limit }));

  if (isPending) return <p className="text-sm text-dust">Loading payments…</p>;
  if (error && !data) return <Notice tone="error">{error.message}</Notice>;

  const payments = data?.payments ?? [];

  if (payments.length === 0) {
    return (
      <EmptyState>
        {status ? `No payments are ${paymentStatusLabels[status].toLowerCase()}.` : "No payments have been started yet."}
      </EmptyState>
    );
  }

  const more = hasMorePayments(payments.length, limit);

  return (
    <div className="grid gap-2">
      <div className="hairline overflow-x-auto rounded-[3px]" aria-busy={isFetching}>
        <table className="data-table">
          <caption className="sr-only">Payments, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Investment</th>
              <th scope="col">Customer</th>
              <th scope="col" className="num">
                Amount
              </th>
              <th scope="col">Status</th>
              <th scope="col">Activated by</th>
              <th scope="col">Created</th>
              <th scope="col">Paid</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="font-mono text-xs">{payment.orderId}</td>
                <td>
                  <Link
                    href={`/investments/${payment.investmentId}`}
                    className="font-mono text-xs hover:text-gold"
                    title={payment.investmentId}
                  >
                    {shortId(payment.investmentId)}
                  </Link>
                </td>
                <td>
                  <CustomerLink customerId={payment.customerId} />
                </td>
                <td className="num font-mono">{formatPaise(payment.amountPaise)}</td>
                <td>
                  <PaymentStatusBadge status={payment.status} />
                  {payment.flagReason ? <div className="mt-1 text-xs text-ember">{flagReasonLabels[payment.flagReason]}</div> : null}
                </td>
                <td>{payment.activationSource ? activationSourceLabels[payment.activationSource] : <span className="text-dust">—</span>}</td>
                <td className="whitespace-nowrap text-dust">{formatDateTime(payment.createdAt)}</td>
                <td className="whitespace-nowrap">{formatDateTime(payment.paidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 text-xs text-dust">
        <p aria-live="polite">
          {payments.length >= PAYMENT_MAX_LIMIT
            ? `Showing the newest ${PAYMENT_MAX_LIMIT} payments. Open an investment to see all of its attempts.`
            : `Showing ${payments.length} ${payments.length === 1 ? "payment" : "payments"}, newest first.`}
        </p>
        {more ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLimit(nextPaymentLimit(limit))}
            disabled={isPlaceholderData}
            aria-busy={isPlaceholderData}
          >
            {isPlaceholderData ? "Loading…" : "Show more"}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}
    </div>
  );
}
