import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { formatPaise, monthlyReturnPaise } from "@nextera/contracts";
import { ReturnsCalculator } from "@/components/calculator/ReturnsCalculator";
import { PlanCard } from "@/components/plans/PlanCard";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { getPublicPlans } from "@/lib/backend/plans";
import { todayInIndia } from "@/lib/dates";
import { illustrativePlan } from "@/lib/plans";
import { brand, disclaimer, steps } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: `${brand.name}: fixed monthly returns, ${brand.byline}` },
  alternates: { canonical: "/" },
};

const EXAMPLE_PRINCIPAL = 135_000_000;
const EXAMPLE_RATE = 800;

function signInFor(slug: string) {
  return `/portal/login?next=${encodeURIComponent(`/portal/plans/${slug}`)}`;
}

export default async function LandingPage() {
  const result = await getPublicPlans();
  const live = result.status === "ok" ? result.plans : [];
  const calculatorPlans = live.length > 0 ? live : [illustrativePlan];
  const startDate = todayInIndia();
  const example = monthlyReturnPaise(EXAMPLE_PRINCIPAL, EXAMPLE_RATE);

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Image
          src="/media/nextera-hero-dusk.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="ken-burns -z-20 object-cover opacity-70"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-inkwell/50 via-inkwell/75 to-inkwell" />
        <div className="orbit-glow absolute inset-0 -z-10" />
        <div className="mx-auto grid min-h-[92svh] max-w-[1320px] items-end gap-12 px-4 pb-12 pt-32 sm:px-6 sm:pb-16 md:px-8 lg:grid-cols-[1.25fr_0.75fr] lg:pb-24">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold sm:text-[11px] sm:tracking-[0.28em]">
              {brand.name} · {brand.byline}
            </p>
            <h1 className="mt-5 max-w-4xl font-display h-display text-parchment">
              Fixed returns, <em className="not-italic text-gold md:italic">credited every month.</em>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-parchment/80 sm:text-lg sm:leading-8">
              Choose a plan with a fixed annual rate and tenure. See exactly what it pays each month before
              you invest, then follow every credit in your {brand.name} portal.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/#plans" size="lg" className="w-full sm:w-auto">
                See live plans
              </ButtonLink>
              <ButtonLink href="/portal/login" variant="ghost" size="lg" className="w-full sm:w-auto">
                Sign in
              </ButtonLink>
            </div>
            <ul className="mt-12 grid max-w-xl grid-cols-3 gap-3 font-mono text-[10px] uppercase tracking-[0.1em] text-dust sm:gap-4 sm:text-[11px] sm:tracking-[0.2em]">
              {["Simple interest", "Monthly credits", "Principal at maturity"].map((item) => (
                <li key={item} className="border-t border-parchment/15 pt-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <aside className="hairline relative rounded-[2px] bg-inkwell/70 p-6 backdrop-blur-sm sm:p-8">
            <p className="eyebrow">Worked example</p>
            <p className="mt-4 text-sm leading-6 text-parchment/75">
              {formatPaise(EXAMPLE_PRINCIPAL)} at 8% a year pays
            </p>
            <p className="mt-2 font-display text-5xl leading-none text-gold tnum sm:text-6xl">{formatPaise(example)}</p>
            <p className="mt-2 text-sm text-dust">every month, for the full tenure</p>
            <div className="gold-rule my-6" />
            <p className="text-xs leading-5 text-dust">
              Illustrative only. Rates and limits depend on the plan you choose; see the disclosures below.
            </p>
          </aside>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1320px] px-4 section-y sm:px-6 md:px-8">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-4 max-w-3xl font-display h-section">From first sign-in to your first monthly credit.</h2>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-[2px] bg-parchment/10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="bg-inkwell p-6 sm:p-8">
              <p className="font-mono text-xs text-gold tnum">0{index + 1}</p>
              <h3 className="mt-6 font-display text-xl text-parchment">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-parchment/70">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="plans" className="border-t border-parchment/10 bg-horizon/40">
        <div className="mx-auto max-w-[1320px] px-4 section-y sm:px-6 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Live plans</p>
              <h2 className="mt-4 max-w-2xl font-display h-section">Pick a rate and a tenure that fit.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-dust">
              Rates are fixed for the life of your investment. Returns are simple interest on your principal,
              credited monthly.
            </p>
          </div>
          <div className="mt-12">
            {result.status === "unavailable" ? (
              <Notice tone="info" title="Live plans are taking a moment to load">
                We could not fetch the current plans just now. Please check back shortly, or{" "}
                <Link href="/enquire" className="text-gold underline">
                  send us an enquiry
                </Link>{" "}
                and we will share them with you.
              </Notice>
            ) : live.length === 0 ? (
              <Notice tone="info" title="New plans are on the way">
                There are no plans open right now.{" "}
                <Link href="/enquire" className="text-gold underline">
                  Leave your details
                </Link>{" "}
                and we will tell you when the next one opens.
              </Notice>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {live.map((plan) => (
                  <li key={plan.id}>
                    <PlanCard plan={plan} href={signInFor(plan.slug)} cta="Sign in to invest" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section id="calculator" className="mx-auto max-w-[1320px] px-4 section-y sm:px-6 md:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Returns calculator</p>
            <h2 className="mt-4 max-w-2xl font-display h-section">See every credit before you commit.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-dust">
            Choose a plan and an amount. The schedule below is exactly how the platform projects your monthly
            credits.
          </p>
        </div>
        <ReturnsCalculator
          plans={calculatorPlans}
          startDate={startDate}
          note={
            live.length > 0
              ? "Projection assumes the investment starts today. Figures are before any tax deducted at source."
              : "Live plans are unavailable, so this uses an illustrative 8% plan over 12 months. Figures are before any tax deducted at source."
          }
        />
      </section>

      <section id="disclosures" className="border-t border-parchment/10">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-4 section-y sm:px-6 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="eyebrow">Disclosures</p>
            <h2 className="mt-4 font-display h-section">Read this before you invest.</h2>
            <p className="mt-6 max-w-sm text-sm leading-6 text-dust">
              We want you to understand exactly what you are buying. If anything here is unclear, ask us before
              you invest.
            </p>
          </div>
          <div className="hairline rounded-[2px] bg-horizon/60 p-6 sm:p-8">
            <ul className="grid gap-5 text-sm leading-7 text-parchment/80">
              {disclaimer.map((item) => (
                <li key={item} className="flex gap-4">
                  <span aria-hidden="true" className="mt-3 h-px w-4 shrink-0 bg-gold/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-parchment/10 bg-horizon/40">
        <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-center md:px-8 md:py-20">
          <div>
            <h2 className="max-w-xl font-display text-[clamp(1.6rem,3.6vw,2.5rem)] leading-tight">
              Ready when you are.
            </h2>
            <p className="mt-3 max-w-lg text-parchment/75">
              Sign in with your mobile number to explore plans, or tell us what you are looking for and our team
              will call you.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="/portal/login" size="lg" className="w-full sm:w-auto">
              Sign in
            </ButtonLink>
            <ButtonLink href="/enquire" variant="ghost" size="lg" className="w-full sm:w-auto">
              Enquire
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
