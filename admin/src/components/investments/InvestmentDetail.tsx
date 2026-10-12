"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { calculateReturns, formatBps, formatPaise } from "@nextera/contracts";
import type { AdminCustomer, AdminInvestment, ReturnsSummary } from "@nextera/contracts";
import { DetailItem, DetailList, Section } from "@/components/investments/DetailList";
import { InvestmentDocuments } from "@/components/investments/InvestmentDocuments";
import { InvestmentStatusBadge } from "@/components/investments/InvestmentStatusBadge";
import { PaymentAttempts } from "@/components/investments/PaymentAttempts";
import { PaymentEvents } from "@/components/investments/PaymentEvents";
import { ReturnSchedule } from "@/components/investments/ReturnSchedule";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime, formatIsoDate, humanize } from "@/lib/format";
import { tenureLabel } from "@/lib/investments/labels";
import { investmentQueries } from "@/lib/queries/investments";

function projectedReturns(investment: AdminInvestment): ReturnsSummary | null {
  if (!investment.startDate) return null;
  try {
    return calculateReturns({
      principalPaise: investment.principalPaise,
      rateBps: investment.rateBps,
      tenureMonths: investment.tenureMonths,
      startDate: investment.startDate,
    });
  } catch {
    return null;
  }
}

export function InvestmentDetail({ investmentId, customer }: { investmentId: string; customer: AdminCustomer | null }) {
  const { data, error, isPending } = useQuery(investmentQueries.detail(investmentId));

  if (isPending) return <p className="text-sm text-dust">Loading investment…</p>;
  if (!data) return <Notice tone="error">{error?.message ?? "Investment not found"}</Notice>;

  const { investment, growth, payments, events, documents } = data;
  const { terms } = investment;
  const returns = projectedReturns(investment);
  const customerLabel = customer ? (customer.name ?? customer.phone) : (investment.customerName ?? investment.customerId);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Investment"
        title={investment.bondNo ?? `${investment.planName} intent`}
        description={
          <>
            {formatPaise(investment.principalPaise)} in {investment.planName} for{" "}
            <Link href={`/customers/${investment.customerId}`} className="text-parchment hover:text-gold">
              {customerLabel}
            </Link>
          </>
        }
        actions={
          <>
            <InvestmentStatusBadge status={investment.status} />
            <ButtonLink href="/investments" variant="ghost" size="sm">
              All investments
            </ButtonLink>
          </>
        }
      />

      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}
      {investment.status === "cancelled" && investment.cancelReason ? (
        <Notice>Cancelled {formatDateTime(investment.cancelledAt)}: {humanize(investment.cancelReason)}</Notice>
      ) : null}

      <Section id="summary-heading" title="Summary">
        <DetailList>
          <DetailItem label="Customer">
            <Link href={`/customers/${investment.customerId}`} className="hover:text-gold">
              {customerLabel}
            </Link>
            {customer ? <div className="font-mono text-xs text-dust">{customer.phone}</div> : null}
          </DetailItem>
          <DetailItem label="Principal">{formatPaise(investment.principalPaise)}</DetailItem>
          <DetailItem label="Monthly return">{formatPaise(investment.monthlyReturnPaise)} gross</DetailItem>
          <DetailItem label="Bond no.">
            <span className="font-mono">{investment.bondNo ?? "Not issued"}</span>
          </DetailItem>
          <DetailItem label="Start date">{investment.startDate ? formatIsoDate(investment.startDate) : "—"}</DetailItem>
          <DetailItem label="Maturity date">{investment.maturityDate ? formatIsoDate(investment.maturityDate) : "—"}</DetailItem>
          <DetailItem label="Total return">{returns ? formatPaise(returns.totalReturnPaise) : "—"}</DetailItem>
          <DetailItem label="Maturity value">{returns ? formatPaise(returns.maturityValuePaise) : "—"}</DetailItem>
          <DetailItem label="Created">{formatDateTime(investment.createdAt)}</DetailItem>
          <DetailItem label="Consented">{formatDateTime(investment.consentedAt)}</DetailItem>
          <DetailItem label="Activated">{formatDateTime(investment.activatedAt)}</DetailItem>
          <DetailItem label={investment.status === "cancelled" ? "Cancelled" : "Matured"}>
            {formatDateTime(investment.status === "cancelled" ? investment.cancelledAt : investment.maturedAt)}
          </DetailItem>
        </DetailList>
      </Section>

      <Section id="terms-heading" title="Terms snapshot" aside="Fixed when the intent was created">
        <DetailList>
          <DetailItem label="Plan">
            {terms.planName}
            <div className="font-mono text-xs text-dust">{terms.planSlug}</div>
          </DetailItem>
          <DetailItem label="Rate">{formatBps(terms.rateBps)} p.a.</DetailItem>
          <DetailItem label="Tenure">{tenureLabel(terms.tenureMonths)}</DetailItem>
          <DetailItem label="Plan limits">
            {formatPaise(terms.minPaise)} to {formatPaise(terms.maxPaise)}
          </DetailItem>
          <DetailItem label="Returns">{humanize(terms.returnsCredit)}</DetailItem>
          <DetailItem label="Principal">{humanize(terms.principalRelease)}</DetailItem>
          <DetailItem label="Interest">{humanize(terms.interest)}</DetailItem>
        </DetailList>
      </Section>

      <ReturnSchedule growth={growth} />
      <PaymentAttempts payments={payments} />
      <PaymentEvents events={events} />
      <InvestmentDocuments
        investmentId={investment.id}
        documents={documents}
        bondExpected={investment.status === "active" || investment.status === "matured"}
      />
    </div>
  );
}
