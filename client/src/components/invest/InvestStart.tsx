"use client";

import { useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBps, formatPaise } from "@nextera/contracts";
import { createInvestmentAction } from "@/app/portal/(app)/invest/actions";
import { PortalNotFoundPanel } from "@/components/portal/PortalNotFoundPanel";
import { Button } from "@/components/ui/Button";
import { controlClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { ApiError } from "@/lib/api/errors";
import { defaultAmountPaise, formatRupeesInput, parseRupeesInput, quote } from "@/lib/calculator";
import { cx } from "@/lib/cx";
import { formatIsoDate } from "@/lib/dates";
import { throwOnAuthLoss } from "@/lib/investClient";
import { formatTenure } from "@/lib/plans";
import { queryKeys } from "@/lib/queries/keys";
import { bankAccountsQuery, meQuery, planQuery } from "@/lib/queries/options";
import { GatePanel } from "./GatePanel";
import { InvestSteps } from "./InvestSteps";

type Gate = "kyc" | "bank" | null;

const kycGate = {
  none: {
    title: "Complete your KYC first",
    body: "We need to verify your PAN, date of birth and address before you can invest. You will add your bank account after that.",
  },
  submitted: {
    title: "Your KYC is under review",
    body: "You can invest as soon as our team finishes verifying your details. Most reviews finish within two working days.",
  },
  rejected: {
    title: "Your KYC needs attention",
    body: "We could not verify the details you submitted. Update them and we will review them again.",
  },
} as const;

function Projection({ label, value, lead }: { label: string; value: string; lead?: boolean }) {
  return (
    <div className={lead ? "col-span-2" : undefined}>
      <dt className="label">{label}</dt>
      <dd className={cx("mt-2 tnum", lead ? "font-display text-4xl leading-none text-gold" : "text-xl text-parchment")}>{value}</dd>
    </div>
  );
}

export function InvestStart({
  slug,
  startDate,
  initialAmountPaise,
}: {
  slug: string;
  startDate: string;
  initialAmountPaise?: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const planResult = useQuery(planQuery(slug));
  const me = useQuery(meQuery());
  const bank = useQuery({ ...bankAccountsQuery(), enabled: me.data?.customer.kycStatus === "verified" });
  const plan = planResult.data?.plan;
  const [amountText, setAmountText] = useState(() =>
    plan ? formatRupeesInput(initialAmountPaise ?? defaultAmountPaise(plan)) : "",
  );
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<{ field: boolean; message: string } | null>(null);
  const [gate, setGate] = useState<Gate>(null);
  const amountId = useId();
  const hintId = useId();
  const errorId = useId();

  const amountPaise = parseRupeesInput(amountText);
  const result = useMemo(() => (plan ? quote({ plan, amountPaise, startDate }) : null), [plan, amountPaise, startDate]);

  const create = useMutation({
    mutationFn: async (amount: string) => throwOnAuthLoss(await createInvestmentAction({ planSlug: slug, amount })),
    onMutate: () => setServerError(null),
    onSuccess: async (outcome) => {
      if (outcome.ok) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.investments.all() });
        router.push(`/portal/invest/${outcome.investmentId}`);
        return;
      }
      if (outcome.code === "kyc" || outcome.code === "bank") {
        if (outcome.code === "kyc") await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
        setGate(outcome.code);
        return;
      }
      setServerError({ field: outcome.field === "amount", message: outcome.message });
    },
    onError: () => setServerError({ field: false, message: "Something went wrong. Please try again." }),
  });

  if (!plan) {
    if (planResult.error instanceof ApiError && planResult.error.status === 404) return <PortalNotFoundPanel />;
    return planResult.isError ? (
      <Notice tone="error" title="We could not load this plan">
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => planResult.refetch()}>
          Try again
        </Button>
      </Notice>
    ) : (
      <p className="min-h-[60vh] text-dust" role="status">
        Loading plan…
      </p>
    );
  }

  const customer = me.data?.customer;
  const kycStatus = customer?.kycStatus;
  const back = (
    <Link href={`/portal/plans/${plan.slug}`} className="inline-flex items-center gap-2 text-sm text-dust hover:text-parchment">
      <span aria-hidden="true">←</span> {plan.name}
    </Link>
  );

  const header = (
    <header className="grid gap-6">
      <div>
        <p className="eyebrow">Invest</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">Invest in {plan.name}</h1>
        <p className="mt-3 text-parchment/75">
          {formatBps(plan.rateBps)} a year for {formatTenure(plan.tenureMonths)}, paid monthly.
        </p>
      </div>
      <InvestSteps current={0} />
    </header>
  );

  if (kycStatus && kycStatus !== "verified") {
    const copy = kycGate[kycStatus];
    return (
      <div className="grid gap-10">
        {back}
        {header}
        <GatePanel title={copy.title} body={copy.body} href="/portal/kyc" cta={kycStatus === "submitted" ? "View KYC status" : "Complete KYC"} />
      </div>
    );
  }

  const accounts = bank.data?.accounts;
  const bankMissing = accounts !== undefined && !accounts.some((account) => account.isPrimary && account.status === "verified");
  const activeGate: Gate = gate ?? (bankMissing ? "bank" : null);

  if (activeGate) {
    return (
      <div className="grid gap-10">
        {back}
        {header}
        {activeGate === "bank" ? (
          <GatePanel
            title="Add your bank account"
            body="Returns and your principal are paid to a verified bank account in your name. Add one and we will verify it in a few seconds."
            href="/portal/bank"
            cta="Add bank account"
          />
        ) : (
          <GatePanel title={kycGate.none.title} body={kycGate.none.body} href="/portal/kyc" cta="Complete KYC" />
        )}
      </div>
    );
  }

  const created = create.isSuccess && create.data.ok;
  const localError = touched && result && !result.ok ? result.message : null;
  const fieldError = localError ?? (serverError?.field ? serverError.message : null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!result?.ok || create.isPending || created) return;
    create.mutate(amountText);
  }

  return (
    <div className="grid gap-10">
      {back}
      {header}
      <form onSubmit={submit} noValidate className="hairline grid overflow-hidden rounded-[2px] bg-horizon lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid content-start gap-6 border-b border-border p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="grid gap-2">
            <label htmlFor={amountId} className="label">
              Amount to invest
            </label>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-lg text-dust">
                ₹
              </span>
              <input
                id={amountId}
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                value={amountText}
                onChange={(event) => {
                  setAmountText(event.target.value);
                  setServerError(null);
                }}
                onBlur={() => setTouched(true)}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? `${errorId} ${hintId}` : hintId}
                maxLength={20}
                className={cx(controlClass, "h-14 pl-10 font-display text-2xl tnum")}
              />
            </div>
            {fieldError ? (
              <p id={errorId} className="text-sm text-ember">
                {fieldError}
              </p>
            ) : null}
            <p id={hintId} className="text-xs text-dust">
              Between {formatPaise(plan.minPaise)} and {formatPaise(plan.maxPaise)}.
            </p>
          </div>

          {serverError && !serverError.field ? <Notice tone="error">{serverError.message}</Notice> : null}

          <Button type="submit" size="lg" className="w-full" disabled={create.isPending || created} aria-busy={create.isPending || created}>
            {create.isPending || created ? "Preparing your agreement…" : "Continue to agreement"}
          </Button>
          <p className="text-xs leading-5 text-dust">
            Next, you will review your agreement and accept it with a one-time code. Nothing is charged until you pay.
          </p>
        </div>

        <div className="p-6 sm:p-8" aria-live="polite" aria-atomic="true">
          <p className="label">Projection</p>
          {result?.ok ? (
            <>
              <dl className="mt-5 grid grid-cols-2 gap-6">
                <Projection label="Monthly return" value={formatPaise(result.summary.monthlyPaise)} lead />
                <Projection label="Total returns" value={formatPaise(result.summary.totalReturnPaise)} />
                <Projection label="Value at maturity" value={formatPaise(result.summary.maturityValuePaise)} />
              </dl>
              <p className="mt-6 text-xs leading-5 text-dust">
                If paid today, the first credit is due {formatIsoDate(result.schedule[0]?.dueDate ?? startDate)} and the plan
                matures on {formatIsoDate(result.summary.maturityDate)}. Figures are before any tax deducted at source; your start
                date is the day your payment is confirmed.
              </p>
            </>
          ) : (
            <p className="mt-5 min-h-[12rem] text-parchment/70">{result?.message}</p>
          )}
        </div>
      </form>
    </div>
  );
}
