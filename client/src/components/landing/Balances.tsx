"use client";

import { useRef } from "react";
import { cx } from "@/lib/cx";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useScrollVar } from "./useScrollVar";

type Side = {
  tag: string;
  heading: string;
  body: string;
  figure: string;
  caption: string;
};

export function Balances({
  principalLabel,
  monthlyLabel,
  maturityDate,
}: {
  principalLabel: string;
  monthlyLabel: string;
  maturityDate: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  useScrollVar(ref, !reduced);

  const stays: Side = {
    tag: "Stays",
    heading: "The principal.",
    body: "The amount you invest cannot be withdrawn early. On the maturity date it moves into your wallet, and only then can you withdraw it to your verified bank account.",
    figure: principalLabel,
    caption: `Locked until ${maturityDate}`,
  };

  const moves: Side = {
    tag: "Moves",
    heading: "The monthly credit.",
    body: "Each credit lands in your wallet, and you can request a withdrawal of anything already credited. A member of the team approves it before it is paid out.",
    figure: monthlyLabel,
    caption: "Credited every month, from month one",
  };

  return (
    <section
      ref={ref}
      id="balances"
      className={cx("act", reduced ? undefined : "h-auto md:h-[215svh]")}
      aria-labelledby="balances-heading"
    >
      <div className="act-pin act-pin-flow-md">
        <h2 id="balances-heading" className="sr-only">
          What stays invested, and what you can ask for
        </h2>

        <div className={cx("relative grid gap-px bg-border", reduced ? undefined : "split h-full md:block")}>
          <Panel
            side={stays}
            className={cx("bg-[#0a0c0f]", reduced ? undefined : "split-a md:absolute md:inset-0")}
            align="start"
            tone="quiet"
            stacked={reduced}
          />
          <Panel
            side={moves}
            className={cx("bg-horizon", reduced ? undefined : "split-b md:absolute md:inset-0")}
            align="end"
            tone="money"
            stacked={reduced}
          />
          {reduced ? null : (
            <div
              aria-hidden="true"
              className="split-rule pointer-events-none absolute inset-0 hidden bg-gold/55 md:block"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function Panel({
  side,
  className,
  align,
  tone,
  stacked,
}: {
  side: Side;
  className: string;
  align: "start" | "end";
  tone: "quiet" | "money";
  stacked?: boolean;
}) {
  const lead = align === "start";
  return (
    <article className={className}>
      <div
        className={cx(
          "flex h-full flex-col justify-center px-5 py-14 sm:px-8",
          stacked
            ? "mx-auto max-w-[1320px] md:px-8"
            : lead
              ? "md:py-0 md:pl-[max(2rem,calc(50vw-640px))] md:pr-[58%]"
              : "md:py-0 md:pl-[58%] md:pr-[max(2rem,calc(50vw-640px))]",
        )}
      >
        <p className={`font-mono text-[11px] uppercase tracking-[0.22em] ${tone === "money" ? "text-gold" : "text-dust"}`}>
          {side.tag}
        </p>
        <h3 className="mt-5 font-display h-section text-parchment">{side.heading}</h3>
        <p className="mt-5 max-w-md text-sm leading-7 text-parchment/75 sm:text-base">{side.body}</p>
        <p className="mt-9 border-t border-border pt-6">
          <span
            className={`block font-display text-[clamp(2.1rem,5.5vw,3.6rem)] leading-none tnum ${
              tone === "money" ? "text-gold" : "text-parchment"
            }`}
          >
            {side.figure}
          </span>
          <span className="mt-3 block font-mono text-[11px] uppercase tracking-[0.16em] text-dust">{side.caption}</span>
        </p>
      </div>
    </article>
  );
}
