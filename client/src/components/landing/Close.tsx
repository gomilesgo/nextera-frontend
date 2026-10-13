"use client";

import { useRef } from "react";
import Link from "next/link";
import { brand } from "@/lib/site";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useScrollVar } from "./useScrollVar";

export function Close({
  principalLabel,
  totalLabel,
  maturityLabel,
  maturityDate,
  rateLabel,
  months,
}: {
  principalLabel: string;
  totalLabel: string;
  maturityLabel: string;
  maturityDate: string;
  rateLabel: string;
  months: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  useScrollVar(ref, !reduced);

  return (
    <section ref={ref} id="maturity" className="act h-[200svh]" aria-labelledby="maturity-heading">
      <div className="act-pin border-t border-border">
        <div aria-hidden="true" className="orbit-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex h-full max-w-[1320px] flex-col justify-center px-4 pb-[calc(var(--bar-h)+1.5rem)] pt-20 sm:px-6 md:px-8">
          <div
            className="mx-auto w-full max-w-3xl"
            style={{
              transform: "translate3d(0, calc((1 - min(1, var(--p) * 2.2)) * 4vh), 0)",
              opacity: "min(1, calc(var(--p) * 3.2))",
            }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dust">Worked example, at maturity</p>
            <h2 id="maturity-heading" className="mt-6 font-display h-plate text-parchment">
              {maturityLabel}
              <span className="block text-dust">on {maturityDate}.</span>
            </h2>

            <dl className="mt-12 grid gap-0 font-mono text-sm">
              <div className="flex items-baseline justify-between gap-6 border-t border-border py-4">
                <dt className="text-dust">Principal, returned at maturity</dt>
                <dd className="tnum text-parchment">{principalLabel}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 border-t border-border py-4">
                <dt className="text-dust">
                  Credits, {months} of {months} at {rateLabel}
                </dt>
                <dd className="tnum text-gold">{totalLabel}</dd>
              </div>
            </dl>

            <Link
              href="#plans"
              className="press group mt-2 flex items-center justify-between gap-6 border-y border-gold/45 bg-gold/[0.07] px-4 py-5 transition-colors hover:bg-gold/[0.14] sm:px-6"
            >
              <span className="font-display text-xl text-parchment sm:text-2xl">See live plans</span>
              <span
                aria-hidden="true"
                className="font-mono text-gold transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>

            <p className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-dust">
              <Link href="/portal/login" className="text-parchment underline decoration-parchment/30 hover:decoration-parchment">
                Sign in to your portal
              </Link>
              <Link href="/enquire" className="text-lagoon underline decoration-lagoon/40 hover:decoration-lagoon">
                Ask us a question
              </Link>
            </p>

            <p className="mt-10 max-w-xl text-xs leading-6 text-dust">
              Illustrative only, on {principalLabel} at {rateLabel} for {months} months, before any tax deducted at
              source. {brand.name} is {brand.byline}. Plans are not bank deposits and are not guaranteed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
