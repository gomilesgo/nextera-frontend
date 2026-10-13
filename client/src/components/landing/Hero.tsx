"use client";

import { useRef, type CSSProperties } from "react";
import ReactDOM from "react-dom";
import { ButtonLink } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useScrollVar } from "./useScrollVar";

const PLATE = "/media/nextera-hero-dusk.jpg";

export function Hero({
  monthlyLabel,
  principalLabel,
  rateLabel,
  months,
}: {
  monthlyLabel: string;
  principalLabel: string;
  rateLabel: string;
  months: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  ReactDOM.preload(PLATE, { as: "image", fetchPriority: "high" });
  useScrollVar(ref, !reduced);

  return (
    <section
      ref={ref}
      id="hero"
      className="act h-[185svh] md:h-[215svh] lg:h-[235svh]"
      style={{ "--plate": `url(${PLATE})` } as CSSProperties}
      aria-labelledby="hero-heading"
    >
      <div className="act-pin bg-inkwell">
        <div aria-hidden="true" className="plane plane-sky" />
        <div aria-hidden="true" className="plane plane-mid" />
        <div aria-hidden="true" className="plane plane-haze" />
        <div aria-hidden="true" className="plane plane-near z-[2]" />
        <div aria-hidden="true" className="scrim-lead pointer-events-none absolute inset-0 z-[3]" />

        {/* The copy plane sits between the ridge behind it and the crest in front. */}
        <div className="relative z-10 mx-auto flex h-full max-w-[1320px] flex-col justify-center px-4 pb-[calc(var(--bar-h)+1rem)] pt-20 sm:px-6 md:px-8">
          <div
            className="max-w-[50rem]"
            style={
              reduced
                ? undefined
                : {
                    transform: "translate3d(0, calc(var(--p) * -7vh), 0)",
                    opacity: "calc(1 - max(0, var(--p) - 0.5) * 2.6)",
                  }
            }
          >
            <h1 id="hero-heading" className="font-display h-display text-parchment">
              Fixed returns, credited every month.
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-parchment/85 sm:text-lg sm:leading-8">
              {principalLabel} at {rateLabel} pays{" "}
              <span className="whitespace-nowrap font-medium text-gold tnum">{monthlyLabel}</span> into your wallet
              every month. The principal comes back at maturity.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="#plans" size="lg" className="press">
                See live plans
              </ButtonLink>
              <ButtonLink href="/portal/login" variant="ghost" size="lg" className="press">
                Sign in
              </ButtonLink>
            </div>
            {reduced ? (
              <p className="mt-10 border-t border-parchment/20 pt-6 font-display text-2xl text-parchment">
                {months} credits.<span className="text-dust"> One date each month.</span>
              </p>
            ) : null}
          </div>
        </div>

        <div aria-hidden="true" className="plane plane-crest z-20" />
        <div aria-hidden="true" className="plane plane-fog z-20" />

        {/* The second beat, legible because the crest arrived behind it. */}
        <div
          className="pointer-events-none absolute inset-0 z-30 mx-auto flex max-w-[1320px] items-center px-4 sm:px-6 md:px-8"
          hidden={reduced}
        >
          <p
            className="ml-auto max-w-lg translate-y-[12vh] text-right font-display text-[clamp(1.6rem,3.6vw,2.9rem)] leading-[1.2] text-parchment"
            style={{ opacity: "max(0, calc(var(--p) * 2.4 - 1.2))" }}
          >
            {months} credits.
            <span className="block text-dust">One date each month.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
