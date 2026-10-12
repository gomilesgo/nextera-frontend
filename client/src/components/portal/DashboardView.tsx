"use client";

import { useQuery } from "@tanstack/react-query";
import { formatBps, formatPaise } from "@nextera/contracts";
import { InvestmentsSummary } from "@/components/investments/InvestmentsSummary";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { firstName } from "@/lib/customer";
import { investmentSummaryQuery } from "@/lib/queries/investments";
import { bankAccountsQuery, meQuery, plansQuery, walletQuery } from "@/lib/queries/options";
import { OnboardingChecklist } from "./OnboardingChecklist";

function greeting(name: string | null): string {
  return name ? `Welcome, ${name}.` : "Welcome to Nextera.";
}

export function DashboardView() {
  const me = useQuery(meQuery());
  const plans = useQuery(plansQuery());
  const bank = useQuery(bankAccountsQuery());
  const wallet = useQuery(walletQuery());
  const summary = useQuery(investmentSummaryQuery());
  const customer = me.data?.customer;

  if (!customer) {
    return me.isError ? (
      <Notice tone="error" title="We could not load your account">
        Please refresh the page. If this keeps happening, try again in a few minutes.
      </Notice>
    ) : (
      <p className="text-dust" role="status">
        Loading your account…
      </p>
    );
  }

  const list = plans.data?.plans ?? [];
  const best = list.reduce<number | null>((max, plan) => (max === null || plan.rateBps > max ? plan.rateBps : max), null);

  return (
    <div className="grid gap-10">
      <header>
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">{greeting(firstName(customer))}</h1>
        <p className="mt-3 max-w-2xl text-parchment/75">
          This is your home for plans, verification and, once you invest, every monthly credit.
        </p>
      </header>

      <InvestmentsSummary />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <section aria-labelledby="wallet-card-heading" className="hairline flex flex-col rounded-[2px] bg-horizon/60 p-6">
          <h2 id="wallet-card-heading" className="label">Wallet</h2>
          {wallet.data ? (
            <p className="mt-3">
              <span className="block font-display text-4xl leading-none text-gold tnum">
                {formatPaise(wallet.data.withdrawablePaise)}
              </span>
              <span className="mt-2 block text-sm text-parchment/75">available to withdraw</span>
            </p>
          ) : wallet.isError ? (
            <p className="mt-3 text-sm text-parchment/75">Balance unavailable.</p>
          ) : (
            <p className="mt-3 text-dust" role="status">Loading…</p>
          )}
          <div className="mt-auto pt-6">
            <ButtonLink href="/portal/wallet" variant="ghost" size="sm" className="w-full sm:w-auto">
              Go to wallet
            </ButtonLink>
          </div>
        </section>

        <section aria-labelledby="plans-heading" className="hairline flex flex-col rounded-[2px] bg-horizon/60 p-6">
          <h2 id="plans-heading" className="label">Plans</h2>
          {plans.isPending ? (
            <p className="mt-3 text-dust" role="status">Loading plans…</p>
          ) : plans.isError ? (
            <p className="mt-3 text-parchment/75">Plans are taking a moment to load.</p>
          ) : list.length === 0 ? (
            <p className="mt-3 text-parchment/75">No plans are open right now.</p>
          ) : (
            <p className="mt-3">
              <span className="block font-display text-4xl leading-none text-gold tnum">{list.length}</span>
              <span className="mt-2 block text-sm text-parchment/75">
                {list.length === 1 ? "plan is" : "plans are"} open now
                {best !== null ? `, paying up to ${formatBps(best)} a year` : ""}.
              </span>
            </p>
          )}
          <div className="mt-auto pt-6">
            <ButtonLink href="/portal/plans" variant="ghost" size="sm" className="w-full sm:w-auto">
              Explore plans
            </ButtonLink>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <OnboardingChecklist
          kycStatus={customer.kycStatus}
          accounts={bank.data?.accounts ?? null}
          accountsUnavailable={bank.isError}
          investmentSummary={summary.data?.summary ?? null}
        />
      </div>
    </div>
  );
}
