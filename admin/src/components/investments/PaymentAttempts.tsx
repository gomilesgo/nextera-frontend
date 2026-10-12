import { formatPaise } from "@nextera/contracts";
import type { AdminPayment } from "@nextera/contracts";
import { Section } from "@/components/investments/DetailList";
import { EmptyState } from "@/components/desk/EmptyState";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { formatDateTime } from "@/lib/format";
import { activationSourceLabels, flagReasonLabels } from "@/lib/payments/labels";

export function PaymentAttempts({ payments }: { payments: readonly AdminPayment[] }) {
  return (
    <Section id="payments-heading" title="Payment attempts" aside={payments.length ? `${payments.length} total, newest first` : null}>
      {payments.length === 0 ? (
        <EmptyState>No checkout has been started for this investment.</EmptyState>
      ) : (
        <div className="hairline overflow-x-auto rounded-[3px]">
          <table className="data-table">
            <caption className="sr-only">Payment attempts, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Status</th>
                <th scope="col" className="num">
                  Amount
                </th>
                <th scope="col">Activated by</th>
                <th scope="col">Created</th>
                <th scope="col">Expires</th>
                <th scope="col">Paid</th>
                <th scope="col">Last checked</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <span className="font-mono text-xs">{payment.orderId}</span>
                    <div className="font-mono text-xs text-dust">
                      {payment.cfPaymentId ? `Cashfree payment ${payment.cfPaymentId}` : (payment.cfOrderId ?? "Not sent to Cashfree")}
                    </div>
                  </td>
                  <td>
                    <PaymentStatusBadge status={payment.status} />
                    <div className="mt-1 text-xs text-dust">
                      {payment.flagReason ? flagReasonLabels[payment.flagReason] : (payment.gatewayStatus ?? "")}
                    </div>
                  </td>
                  <td className="num font-mono">{formatPaise(payment.amountPaise)}</td>
                  <td>{payment.activationSource ? activationSourceLabels[payment.activationSource] : <span className="text-dust">—</span>}</td>
                  <td className="whitespace-nowrap text-dust">{formatDateTime(payment.createdAt)}</td>
                  <td className="whitespace-nowrap text-dust">{formatDateTime(payment.expiresAt)}</td>
                  <td className="whitespace-nowrap">{formatDateTime(payment.paidAt)}</td>
                  <td className="whitespace-nowrap text-dust">{formatDateTime(payment.lastCheckedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
