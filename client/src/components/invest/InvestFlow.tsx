"use client";

import { useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import { PortalNotFoundPanel } from "@/components/portal/PortalNotFoundPanel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ApiError } from "@/lib/api/errors";
import { investmentStep } from "@/lib/investments";
import { investmentQuery } from "@/lib/queries/investments";
import { meQuery } from "@/lib/queries/options";
import { AgreementStep } from "./AgreementStep";
import { InvestSteps } from "./InvestSteps";
import { PayButton } from "./PayButton";
import { TermsAside } from "./TermsAside";

export function InvestFlow({ investmentId }: { investmentId: string }) {
  const detail = useQuery(investmentQuery(investmentId));
  const me = useQuery(meQuery());
  const paymentHeading = useRef<HTMLHeadingElement>(null);

  if (!detail.data) {
    if (detail.error instanceof ApiError && detail.error.status === 404) return <PortalNotFoundPanel />;
    return detail.isError ? (
      <Notice tone="error" title="We could not load this investment">
        <span className="block">{detail.error.message}</span>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => detail.refetch()} disabled={detail.isFetching}>
          {detail.isFetching ? "Retrying…" : "Try again"}
        </Button>
      </Notice>
    ) : (
      <p className="min-h-[60vh] text-dust" role="status">
        Loading your investment…
      </p>
    );
  }

  const { investment, payment } = detail.data;
  const step = investmentStep(investment);
  const current = step === "agreement" ? 1 : step === "payment" ? 2 : 3;

  return (
    <div className="grid gap-10">
      <Link href={`/portal/plans/${investment.planSlug}`} className="inline-flex items-center gap-2 text-sm text-dust hover:text-parchment">
        <span aria-hidden="true">←</span> {investment.planName}
      </Link>
      <header className="grid gap-6">
        <div>
          <p className="eyebrow">Invest</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">
            {formatPaise(investment.principalPaise)} in {investment.planName}
          </h1>
        </div>
        <InvestSteps current={current} />
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          {step === "agreement" ? (
            <AgreementStep
              investmentId={investment.id}
              phone={me.data?.customer.phone ?? null}
              onAccepted={() => window.setTimeout(() => paymentHeading.current?.focus(), 50)}
            />
          ) : null}

          {step === "payment" ? (
            <section aria-labelledby="payment-heading" className="hairline grid gap-6 rounded-[2px] bg-horizon p-6 sm:p-8">
              <div>
                <h2 id="payment-heading" ref={paymentHeading} tabIndex={-1} className="font-display text-2xl outline-none sm:text-3xl">
                  Pay securely
                </h2>
                <p className="mt-2 max-w-2xl leading-7 text-parchment/75">
                  Your agreement is accepted. Pay {formatPaise(investment.principalPaise)} through Cashfree by UPI, net banking or
                  card. Your investment becomes active once Cashfree confirms the payment to us, usually within a minute.
                </p>
              </div>
              {payment && payment.status === "created" ? (
                <Notice tone="info">
                  You have already started a payment.{" "}
                  <Link href={`/portal/invest/${investment.id}/status`} className="text-lagoon underline">
                    Check its status
                  </Link>{" "}
                  before paying again.
                </Notice>
              ) : null}
              <PayButton investmentId={investment.id} amountPaise={investment.principalPaise} />
              <p className="text-xs leading-5 text-dust">
                Payment is handled by Cashfree Payments. Nextera never sees your card or bank login details.
              </p>
            </section>
          ) : null}

          {step === "done" ? (
            <Notice tone="success" title="This investment is active">
              <ButtonLink href={`/portal/investments/${investment.id}`} size="sm" className="mt-3">
                View investment
              </ButtonLink>
            </Notice>
          ) : null}

          {step === "closed" ? (
            <Notice tone="info" title="This investment was cancelled">
              <span className="block">It was not paid in time, so it has been closed. If money left your account for it, write to us and we will sort it out. You can start again at any time.</span>
              <ButtonLink href={`/portal/invest/new/${investment.planSlug}`} size="sm" className="mt-3">
                Start a new investment
              </ButtonLink>
            </Notice>
          ) : null}
        </div>

        <TermsAside
          planName={investment.planName}
          principalPaise={investment.principalPaise}
          rateBps={investment.rateBps}
          tenureMonths={investment.tenureMonths}
          monthlyReturnPaise={investment.monthlyReturnPaise}
        />
      </div>
    </div>
  );
}
