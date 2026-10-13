"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { cx } from "@/lib/cx";
import { steps } from "@/lib/site";
import { window01 } from "./run";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useScrollVar } from "./useScrollVar";

const EXTRAS: Record<number, { heading: string; items: string[] }> = {
  1: {
    heading: "You will need",
    items: [
      "A mobile number. You sign in with a one-time code, so there is no password and no email login.",
      "PAN, the name on it, your date of birth and your address.",
      "A bank account in your own name. We verify it with a small test credit before the first investment.",
    ],
  },
  2: {
    heading: "You will need",
    items: ["To read the agreement for that investment and accept it with another one-time code."],
  },
};

export function Process() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);

  useScrollVar(ref, !reduced, (progress) => {
    const index = Math.min(steps.length - 1, Math.floor(window01(progress, 0.06, 0.94) * steps.length));
    setActive((current) => (current === index ? current : index));
  });

  return (
    <section
      ref={ref}
      id="process"
      className="act border-t border-border lg:h-[300svh]"
      aria-labelledby="process-heading"
    >
      <div className="act-pin act-pin-flow-lg">
        <div className="mx-auto grid h-full max-w-[1320px] content-center gap-10 px-4 pb-[calc(var(--bar-h)+1rem)] pt-20 sm:px-6 md:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-20">
          <div>
            <h2 id="process-heading" className="font-display h-section text-parchment">
              From the first sign-in to the first credit.
            </h2>
            <ol className="mt-8 grid gap-0">
              {steps.map((step, index) => (
                <li key={step.title} className="border-t border-border last:border-b">
                  <span
                    className={cx(
                      "flex items-center gap-4 py-3 font-mono text-xs uppercase tracking-[0.14em] transition-colors duration-300",
                      reduced
                        ? "text-parchment/70"
                        : index === active
                          ? "text-gold"
                          : index < active
                            ? "text-parchment/60"
                            : "text-dust/70",
                    )}
                  >
                    <span className="tnum">{String(index + 1).padStart(2, "0")}</span>
                    <span className="tracking-normal normal-case">{step.title}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-6 max-w-sm text-sm leading-6 text-dust">
              Online investing is opening in stages. If a plan is visible but payment is not open yet,{" "}
              <Link href="/enquire" className="text-lagoon underline">
                send an enquiry
              </Link>{" "}
              and we will tell you when it is.
            </p>
          </div>

          <div className="step-stack grid gap-14 lg:min-h-[20rem] lg:gap-0">
            {steps.map((step, index) => {
              const extra = EXTRAS[index];
              return (
                <div
                  key={step.title}
                  className="step-panel lg:col-start-1 lg:row-start-1"
                  data-on={index === active ? "true" : "false"}
                >
                  <h3 className="font-display text-[clamp(2rem,4.6vw,3.2rem)] leading-tight text-parchment">
                    {step.title}
                  </h3>
                  <p className="mt-5 max-w-xl text-base leading-7 text-parchment/80">{step.body}</p>
                  {extra ? (
                    <div className="mt-8 border-t border-border pt-6">
                      <p className="label">{extra.heading}</p>
                      <ul className="mt-4 grid max-w-xl gap-3">
                        {extra.items.map((item) => (
                          <li key={item} className="flex gap-3 text-sm leading-6 text-parchment/70">
                            <span aria-hidden="true" className="mt-[0.7rem] h-px w-3 shrink-0 bg-gold/70" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
