"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import { DetailItem, DetailList, Section } from "@/components/investments/DetailList";
import { eventJson } from "@/components/investments/PaymentEvents";
import { CustomerLink } from "@/components/payments/CustomerLink";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { ResolveFlag } from "@/components/payments/ResolveFlag";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime } from "@/lib/format";
import { activationSourceLabels, eventSourceLabels, flagReasonHelp, flagReasonLabels, resolutionLabels, resolutionReferenceLabels } from "@/lib/payments/labels";
import { activationAvailability } from "@/lib/payments/resolve";
import { paymentQueries } from "@/lib/queries/payments";

export function FlagDetail({ flagId, canResolve }: { flagId: string; canResolve: boolean }) {
  const { data, error, isPending } = useQuery(paymentQueries.flag(flagId));
  const resolutionHeading = useRef<HTMLHeadingElement>(null);
  const isResolved = Boolean(data?.flag.resolvedAt);
  const wasResolved = useRef(isResolved);

  useEffect(() => {
    if (isResolved && !wasResolved.current) resolutionHeading.current?.focus();
    wasResolved.current = isResolved;
  }, [isResolved]);

  if (isPending) return <p className="text-sm text-dust">Loading payment flag…</p>;
  if (!data) return <Notice tone="error">{error?.message ?? "Payment flag not found"}</Notice>;

  const { flag, payment } = data;
  const reason = flag.flagReason;
  const resolved = flag.resolvedAt !== null;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Payment flag"
        title={reason ? flagReasonLabels[reason] : flag.type}
        description={reason ? flagReasonHelp[reason] : null}
        actions={
          <>
            <Badge tone={resolved ? "neutral" : "danger"}>{resolved ? "Resolved" : "Open"}</Badge>
            <ButtonLink href={`/payment-flags?status=${resolved ? "resolved" : "open"}`} variant="ghost" size="sm">
              Back to flags
            </ButtonLink>
          </>
        }
      />

      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}

      <Section id="flag-heading" title="What happened">
        <DetailList>
          <DetailItem label="Reason">{reason ? flagReasonLabels[reason] : "—"}</DetailItem>
          <DetailItem label="Raised by">{eventSourceLabels[flag.source]}</DetailItem>
          <DetailItem label="Raised">{formatDateTime(flag.receivedAt)}</DetailItem>
          <DetailItem label="Order">
            <span className="font-mono text-xs">{flag.orderId ?? "—"}</span>
          </DetailItem>
          <DetailItem label="Detail" wide>
            <span className="font-mono text-xs">{flag.flagDetail ?? "—"}</span>
          </DetailItem>
        </DetailList>
      </Section>

      <Section id="payment-heading" title="Payment">
        {payment ? (
          <DetailList>
            <DetailItem label="Status">
              <PaymentStatusBadge status={payment.status} />
            </DetailItem>
            <DetailItem label="Amount">{formatPaise(payment.amountPaise)}</DetailItem>
            <DetailItem label="Investment">
              <Link href={`/investments/${payment.investmentId}`} className="hover:text-gold">
                Open investment
              </Link>
            </DetailItem>
            <DetailItem label="Customer">
              <CustomerLink customerId={payment.customerId} label="Open customer" />
            </DetailItem>
            <DetailItem label="Cashfree payment">
              <span className="font-mono text-xs">{payment.cfPaymentId ?? "—"}</span>
            </DetailItem>
            <DetailItem label="Gateway status">{payment.gatewayStatus ?? "—"}</DetailItem>
            <DetailItem label="Paid">{formatDateTime(payment.paidAt)}</DetailItem>
            <DetailItem label="Activated by">
              {payment.activationSource ? activationSourceLabels[payment.activationSource] : "—"}
            </DetailItem>
          </DetailList>
        ) : (
          <div className="hairline rounded-[3px] px-4 py-6 text-center text-sm text-dust">
            {flag.paymentId
              ? "This payment is not among the 200 most recent. Search for the order id in Cashfree."
              : "This order was not created by the platform, so there is no payment record."}
          </div>
        )}
      </Section>

      <Section id="resolution-heading" title="Resolution" headingRef={resolutionHeading}>
        {resolved ? (
          <DetailList>
            <DetailItem label="Resolution">{flag.resolutionType ? resolutionLabels[flag.resolutionType] : "Resolved"}</DetailItem>
            <DetailItem label={flag.resolutionType ? (resolutionReferenceLabels[flag.resolutionType] ?? "Reference") : "Reference"}>
              <span className="font-mono text-xs">{flag.resolutionReference ?? "—"}</span>
            </DetailItem>
            <DetailItem label="Resolved">{formatDateTime(flag.resolvedAt)}</DetailItem>
            <DetailItem label="Resolved by">
              <span className="font-mono text-xs">{flag.resolvedBy ?? "—"}</span>
            </DetailItem>
            <DetailItem label="Note" wide>
              <span className="whitespace-pre-wrap">{flag.resolutionNote ?? "—"}</span>
            </DetailItem>
          </DetailList>
        ) : canResolve ? (
          <div className="hairline grid gap-3 rounded-[3px] p-5">
            <p className="text-sm text-dust">
              Settle the money first: refund it in Cashfree, post it to the ledger with a manual adjustment, or confirm that a later
              webhook activated the investment. Then record the outcome here.
            </p>
            <div>
              <ResolveFlag flagId={flag.id} activation={activationAvailability(payment)} />
            </div>
          </div>
        ) : (
          <Notice>Only owners and operations staff can resolve payment flags.</Notice>
        )}
      </Section>

      <details className="text-xs">
        <summary className="cursor-pointer text-dust hover:text-parchment">Event record</summary>
        <pre className="hairline mt-2 max-h-80 overflow-auto rounded-[3px] bg-inkwell p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
          {eventJson(flag)}
        </pre>
      </details>
    </div>
  );
}
