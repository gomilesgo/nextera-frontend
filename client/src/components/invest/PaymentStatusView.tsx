"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import { PortalNotFoundPanel } from "@/components/portal/PortalNotFoundPanel";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ApiError } from "@/lib/api/errors";
import { paymentView, pollTimedOut } from "@/lib/paymentPolling";
import type { PaymentView } from "@/lib/paymentPolling";
import { investmentFileUrl } from "@/lib/queries/documents";
import { paymentStatusQuery } from "@/lib/queries/investments";
import { queryKeys } from "@/lib/queries/keys";
import { brand } from "@/lib/site";
import { PayButton } from "./PayButton";

const headline: Record<PaymentView, string> = {
  success: "Payment received. Your investment is active.",
  awaiting_bond: "Payment received. Your investment is active.",
  processing: "Confirming your payment…",
  activating: "Payment received. Activating your investment…",
  not_started: "Payment not started yet",
  needs_consent: "Accept your agreement first",
  retry: "This payment did not go through",
  review: "We are checking this payment",
  cancelled: "This investment was cancelled",
};

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-5 animate-spin rounded-full border-2 border-gold/30 border-t-gold motion-reduce:animate-none"
    />
  );
}

export function PaymentStatusView({ investmentId }: { investmentId: string }) {
  const queryClient = useQueryClient();
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const restartPolling = () => setStartedAt(Date.now());
  const status = useQuery(paymentStatusQuery(investmentId, { startedAt }));
  const settled = useRef(false);
  const data = status.data;
  const view = data ? paymentView(data) : null;
  const active = view === "success" || view === "awaiting_bond";

  useEffect(() => {
    if (!active || settled.current) return;
    settled.current = true;
    void queryClient.invalidateQueries({ queryKey: queryKeys.investments.list() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.investments.summary() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.investments.detail(investmentId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.statements.all() });
  }, [active, investmentId, queryClient]);

  if (status.error instanceof ApiError && status.error.status === 404) return <PortalNotFoundPanel />;

  const timedOut = pollTimedOut(view, status.dataUpdatedAt - startedAt) && !status.isFetching;
  const investment = data?.investment;

  return (
    <div className="mx-auto grid max-w-2xl gap-8">
      <header>
        <p className="eyebrow">Payment status</p>
        <h1 className="mt-3 font-display text-[clamp(1.9rem,5vw,3rem)] leading-tight" aria-live="polite" aria-atomic="true">
          {view ? headline[view] : "Checking your payment…"}
        </h1>
        {investment ? (
          <p className="mt-3 text-parchment/75 tnum">
            {formatPaise(investment.principalPaise)} in {investment.planName}
          </p>
        ) : null}
      </header>

      <section className="hairline grid min-h-[14rem] content-start gap-6 rounded-[2px] bg-horizon p-6 sm:p-8" aria-live="polite">
        {!data && status.isError ? (
          <Notice tone="error" title="We could not check this payment">
            <span className="block">{status.error.message}</span>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => status.refetch()} disabled={status.isFetching}>
              {status.isFetching ? "Checking…" : "Check again"}
            </Button>
          </Notice>
        ) : null}

        {!data && !status.isError ? (
          <p className="flex items-center gap-3 text-parchment/80" role="status">
            <Spinner /> Asking Cashfree for the latest status…
          </p>
        ) : null}

        {investment && view === "success" ? (
          <>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="label">Bond number</dt>
                <dd className="mt-2 font-mono text-xl text-gold">{investment.bondNo}</dd>
              </div>
              <div>
                <dt className="label">Monthly return</dt>
                <dd className="mt-2 text-xl tnum">{formatPaise(investment.monthlyReturnPaise)}</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={`/portal/investments/${investment.id}`}>View investment</ButtonLink>
              <a href={investmentFileUrl(investment.id, "bond", true)} download className={buttonClass("ghost")}>
                Download bond certificate
              </a>
            </div>
          </>
        ) : null}

        {investment && view === "awaiting_bond" ? (
          <>
            <p className="flex items-center gap-3 leading-7 text-parchment/80">
              {timedOut ? null : <Spinner />}
              {timedOut
                ? "Your bond certificate is being issued and will appear on your investment page shortly."
                : "We are issuing your bond certificate. This takes a few moments."}
            </p>
            <ButtonLink href={`/portal/investments/${investment.id}`} className="w-full sm:w-auto">
              View investment
            </ButtonLink>
          </>
        ) : null}

        {investment && view === "activating" ? (
          <p className="flex items-center gap-3 leading-7 text-parchment/80">
            {timedOut ? null : <Spinner />}
            {timedOut
              ? "Cashfree has confirmed your payment. Your investment will be activated shortly; there is no need to pay again."
              : "Cashfree has confirmed your payment. We are activating your investment; there is no need to pay again."}
          </p>
        ) : null}

        {investment && view === "processing" ? (
          <>
            {timedOut ? (
              <Notice tone="info" title="This is taking longer than usual">
                If money left your account, there is no need to pay again: we will activate your investment as soon as Cashfree
                confirms it, and the page will show it next time you visit. If you did not finish paying, you can pay now.
              </Notice>
            ) : (
              <p className="flex items-center gap-3 leading-7 text-parchment/80">
                <Spinner /> We are waiting for Cashfree to confirm your payment. Keep this page open; it updates by itself.
              </p>
            )}
            {!timedOut ? (
              <p className="text-sm leading-6 text-dust">
                Cashfree still shows this order as open. If you did not finish paying, you can pay now. If money left your
                account, do not pay again.
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {timedOut ? (
                <Button variant="ghost" size="lg" onClick={() => status.refetch()} disabled={status.isFetching}>
                  Check again
                </Button>
              ) : null}
              <PayButton
                investmentId={investment.id}
                amountPaise={investment.principalPaise}
                variant="ghost"
                onStatusPage
                onStarted={restartPolling}
              />
            </div>
          </>
        ) : null}

        {investment && (view === "retry" || view === "not_started") ? (
          <>
            <p className="leading-7 text-parchment/80">
              {view === "retry"
                ? "The payment window closed before Cashfree confirmed a payment. If no payment went through, nothing was charged for this attempt; if money did leave your account, write to us before paying again. You can try again while this investment is open."
                : "Your agreement is accepted. Pay to activate your investment."}
            </p>
            <PayButton
              investmentId={investment.id}
              amountPaise={investment.principalPaise}
              label={view === "retry" ? "Try payment again" : undefined}
              onStatusPage
              onStarted={restartPolling}
            />
          </>
        ) : null}

        {investment && view === "needs_consent" ? (
          <ButtonLink href={`/portal/invest/${investment.id}`} className="w-full sm:w-auto">
            Review agreement
          </ButtonLink>
        ) : null}

        {investment && view === "review" ? (
          <p className="leading-7 text-parchment/80">
            Cashfree reported something unusual about this payment, so our team is checking it before activating your
            investment. You do not need to pay again. If you have questions, write to{" "}
            <a href={`mailto:${brand.email}`} className="text-lagoon underline">
              {brand.email}
            </a>
            .
          </p>
        ) : null}

        {investment && view === "cancelled" ? (
          <>
            <p className="leading-7 text-parchment/80">
              It was not paid in time, so it has been closed. If money left your account for it, write to {brand.email} and we
              will sort it out.
            </p>
            <ButtonLink href={`/portal/invest/new/${investment.planSlug}`} className="w-full sm:w-auto">
              Start a new investment
            </ButtonLink>
          </>
        ) : null}

      </section>

      <p className="text-xs leading-5 text-dust">
        This page shows what Cashfree has confirmed to Nextera. Your investment becomes active only after that confirmation.
      </p>
    </div>
  );
}
