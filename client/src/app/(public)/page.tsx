import Link from "next/link";
import type { Metadata } from "next";
import { calculateReturns, formatBps, formatPaise, monthlyReturnPaise, projectSchedule } from "@nextera/contracts";
import { ReturnsCalculator } from "@/components/calculator/ReturnsCalculator";
import { Balances } from "@/components/landing/Balances";
import { Close } from "@/components/landing/Close";
import { Hero } from "@/components/landing/Hero";
import { Instrument, type Stop } from "@/components/landing/Instrument";
import { PlanRail } from "@/components/landing/PlanRail";
import { Process } from "@/components/landing/Process";
import { Record } from "@/components/landing/Record";
import { Terms } from "@/components/landing/Terms";
import { YearRun } from "@/components/landing/YearRun";
import { Notice } from "@/components/ui/Notice";
import { getPublicPlans } from "@/lib/backend/plans";
import { formatIsoDate, todayInIndia } from "@/lib/dates";
import { illustrativePlan } from "@/lib/plans";
import { brand } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: `${brand.name}: fixed monthly returns, ${brand.byline}` },
  alternates: { canonical: "/" },
};

const EXAMPLE_PRINCIPAL = 135_000_000;
const EXAMPLE_RATE = 800;
const EXAMPLE_MONTHS = 12;

const STOPS: Stop[] = [
  { id: "balances", label: "Terms" },
  { id: "year", label: "The year" },
  { id: "plans", label: "Plans" },
  { id: "calculator", label: "Your amount" },
  { id: "process", label: "Getting in" },
  { id: "risks", label: "Risks" },
  { id: "maturity", label: "Maturity" },
];

function signInFor(slug: string) {
  return `/portal/login?next=${encodeURIComponent(`/portal/plans/${slug}`)}`;
}

export default async function LandingPage() {
  const result = await getPublicPlans();
  const live = result.status === "ok" ? result.plans : [];
  const calculatorPlans = live.length > 0 ? live : [illustrativePlan];

  const startDate = todayInIndia();
  const example = {
    principalPaise: EXAMPLE_PRINCIPAL,
    rateBps: EXAMPLE_RATE,
    tenureMonths: EXAMPLE_MONTHS,
    startDate,
  };
  const schedule = projectSchedule(example);
  const summary = calculateReturns(example);
  const monthlyPaise = monthlyReturnPaise(EXAMPLE_PRINCIPAL, EXAMPLE_RATE);

  const principalLabel = formatPaise(EXAMPLE_PRINCIPAL);
  const monthlyLabel = formatPaise(monthlyPaise);
  const totalLabel = formatPaise(summary.totalReturnPaise);
  const maturityLabel = formatPaise(summary.maturityValuePaise);
  const maturityDate = formatIsoDate(summary.maturityDate);
  const rateLabel = formatBps(EXAMPLE_RATE);

  const rows = schedule.map((period) => ({
    no: period.periodNo,
    dueDate: formatIsoDate(period.dueDate),
    creditLabel: formatPaise(period.grossPaise),
    soFarLabel: formatPaise(period.cumulativePaise),
  }));

  return (
    <>
      <Hero
        monthlyLabel={monthlyLabel}
        principalLabel={principalLabel}
        rateLabel={rateLabel}
        months={EXAMPLE_MONTHS}
      />

      <Balances principalLabel={principalLabel} monthlyLabel={monthlyLabel} maturityDate={maturityDate} />

      <YearRun
        rows={rows}
        monthlyPaise={monthlyPaise}
        principalLabel={principalLabel}
        totalLabel={totalLabel}
        maturityLabel={maturityLabel}
        maturityDate={maturityDate}
        rateLabel={rateLabel}
      />

      {live.length > 0 ? (
        <PlanRail items={live.map((plan) => ({ plan, href: signInFor(plan.slug) }))} />
      ) : (
        <section id="plans" className="border-t border-border" aria-labelledby="plans-heading">
          <div className="mx-auto max-w-[1320px] px-4 section-y sm:px-6 md:px-8">
            <h2 id="plans-heading" className="max-w-2xl font-display h-section text-parchment">
              Live plans, open now.
            </h2>
            <div className="mt-10 max-w-2xl">
              {result.status === "unavailable" ? (
                <Notice tone="info" title="Live plans are taking a moment to load">
                  We could not fetch the current plans just now. Please check back shortly, or{" "}
                  <Link href="/enquire" className="text-lagoon underline">
                    send us an enquiry
                  </Link>{" "}
                  and we will share them with you.
                </Notice>
              ) : (
                <Notice tone="info" title="New plans are on the way">
                  There are no plans open right now.{" "}
                  <Link href="/enquire" className="text-lagoon underline">
                    Leave your details
                  </Link>{" "}
                  and we will tell you when the next one opens.
                </Notice>
              )}
            </div>
          </div>
        </section>
      )}

      <section id="calculator" className="border-t border-border" aria-labelledby="calculator-heading">
        <div className="mx-auto max-w-[1320px] px-4 section-y sm:px-6 md:px-8">
          <h2 id="calculator-heading" className="max-w-2xl font-display h-section text-parchment">
            Now put your own number in.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-parchment/75">
            Choose a plan and an amount. The schedule below is exactly how the platform projects your credits, with
            the same dates your portal will use.
          </p>
          <div className="mt-10 rise">
            <ReturnsCalculator
              plans={calculatorPlans}
              startDate={startDate}
              note={
                live.length > 0
                  ? "Projection assumes the investment starts today. Figures are before any tax deducted at source."
                  : "Live plans are unavailable, so this uses an illustrative 8% plan over 12 months. Figures are before any tax deducted at source."
              }
            />
          </div>
        </div>
      </section>

      <Process />

      <Record />

      <Terms />

      <Close
        principalLabel={principalLabel}
        totalLabel={totalLabel}
        maturityLabel={maturityLabel}
        maturityDate={maturityDate}
        rateLabel={rateLabel}
        months={EXAMPLE_MONTHS}
      />

      <Instrument
        stops={STOPS}
        months={EXAMPLE_MONTHS}
        monthlyPaise={monthlyPaise}
        principalLabel={principalLabel}
        creditDates={rows.map((row) => row.dueDate)}
        maturityDate={maturityDate}
      />
    </>
  );
}
