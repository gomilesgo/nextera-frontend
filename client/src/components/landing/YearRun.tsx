"use client";

import { useEffect, useRef, useState } from "react";
import { formatPaise } from "@nextera/contracts";
import { cx } from "@/lib/cx";
import { setLedger } from "./ledgerStore";
import { creditsLanded, maturityReached } from "./run";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useScrollVar } from "./useScrollVar";

export type RunRow = { no: number; dueDate: string; creditLabel: string; soFarLabel: string };

const NOTES = [
  "The rate is fixed for the life of the investment. It does not step up, and it is not revised halfway through the tenure.",
  "Returns are simple interest on your principal, so month twelve pays exactly what month one paid. Nothing compounds.",
  "The principal is never touched along the way. It is returned on the maturity date, into the same wallet.",
];

export function YearRun({
  rows,
  monthlyPaise,
  principalLabel,
  totalLabel,
  maturityLabel,
  maturityDate,
  rateLabel,
}: {
  rows: RunRow[];
  monthlyPaise: number;
  principalLabel: string;
  totalLabel: string;
  maturityLabel: string;
  maturityDate: string;
  rateLabel: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [credits, setCredits] = useState(0);
  const [matured, setMatured] = useState(false);
  const months = rows.length;

  // Measured off the scroll path, so the frame callback never reads layout.
  const overflowRef = useRef(0);
  const landedRef = useRef(-1);
  const maturedRef = useRef(false);

  useEffect(() => {
    const frame = frameRef.current;
    const track = trackRef.current;
    if (!frame || !track) return;

    const measure = () => {
      overflowRef.current = Math.max(0, track.offsetHeight - frame.clientHeight);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useScrollVar(ref, !reduced, (progress) => {
    const landed = creditsLanded(progress, months);
    const done = maturityReached(progress);
    // The last credit lands slightly before maturity, so both are compared.
    if (landed === landedRef.current && done === maturedRef.current) return;
    landedRef.current = landed;
    maturedRef.current = done;

    setCredits(landed);
    setMatured(done);
    setLedger({ credits: landed, matured: done });

    // On a short viewport the ledger is taller than its frame, so it advances
    // under the landing credits and the maturity row is always reached.
    ref.current?.style.setProperty(
      "--shift",
      String(Math.round((landed / months) * overflowRef.current)),
    );
  });

  const note = NOTES[credits >= months - 3 ? 2 : credits >= Math.ceil(months / 3) ? 1 : 0];

  return (
    <section ref={ref} id="year" className="act h-[380svh] md:h-[520svh]" aria-labelledby="year-heading">
      <div className="act-pin border-t border-border bg-inkwell">
        <div aria-hidden="true" className="orbit-glow pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid h-full max-w-[1320px] content-center gap-8 px-4 pb-[calc(var(--bar-h)+0.5rem)] pt-16 sm:px-6 md:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-16 lg:pt-20">
          <div className="min-w-0">
            <h2 id="year-heading" className="font-display h-section text-parchment">
              The year runs.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-dust">
              {principalLabel} at {rateLabel}, over {months} months. Illustrative, not a plan on sale today.
            </p>

            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-dust sm:mt-8">
              Credited so far
            </p>
            <p
              className={cx(
                "mt-2 font-display text-[clamp(2.3rem,9vw,5.4rem)] leading-none tnum transition-colors duration-300",
                credits > 0 ? "text-gold" : "text-parchment/35",
              )}
            >
              {formatPaise(monthlyPaise * credits)}
            </p>
            <p className="mt-3 font-mono text-xs tracking-[0.08em] text-dust tnum">
              {String(credits).padStart(2, "0")} of {months} credits
              {matured ? ` · principal returned ${maturityDate}` : ""}
            </p>

            <div
              className={cx(
                "mt-8 hidden max-w-sm border-t border-border pt-6 lg:grid",
                reduced ? "gap-4" : undefined,
              )}
            >
              {NOTES.map((item) => (
                <p
                  key={item}
                  className={cx(
                    "text-sm leading-6 text-parchment/70",
                    reduced ? undefined : "col-start-1 row-start-1 transition-opacity duration-500",
                  )}
                  style={reduced ? undefined : { opacity: item === note ? 1 : 0 }}
                  aria-hidden={reduced || item === note ? undefined : "true"}
                >
                  {item}
                </p>
              ))}
            </div>

            <p className="mt-8 hidden max-w-sm border-t border-border pt-5 text-xs leading-6 text-dust sm:block">
              {totalLabel} of credits over the year, then {principalLabel} returned. Figures are before any tax
              deducted at source.
            </p>
          </div>

          <div
            ref={frameRef}
            className="ledger-frame plate min-w-0 max-h-[calc(100svh-16rem)] overflow-hidden rounded-[3px] lg:max-h-[calc(100svh-11rem)]"
          >
            <div ref={trackRef} className="ledger-track">
              <table className="w-full border-collapse">
              <caption className="sr-only">
                Illustrative schedule: {rows[0]?.creditLabel} credited each month on {principalLabel} at {rateLabel} for{" "}
                {months} months, then the principal returned on {maturityDate}.
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-3 py-2 text-left sm:py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-dust sm:px-5">
                    Due
                  </th>
                  <th scope="col" className="px-3 py-2 text-right sm:py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-dust sm:px-5">
                    Credit
                  </th>
                  <th scope="col" className="px-3 py-2 text-right sm:py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-dust sm:px-5">
                    So far
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const landed = row.no <= credits;
                  return (
                    <tr
                      key={row.no}
                      className="credit-row border-b border-border/70"
                      data-landed={landed ? "true" : "false"}
                      data-fresh={row.no === credits ? "true" : "false"}
                    >
                      <th
                        scope="row"
                        className="px-3 py-[0.36rem] sm:py-[0.55rem] text-left font-mono text-[11px] font-normal text-dust tnum sm:px-5 sm:text-xs"
                      >
                        <span className="text-parchment/45">{String(row.no).padStart(2, "0")}</span>
                        <span className="ml-2.5">{row.dueDate}</span>
                      </th>
                      <td className="credit-amount px-3 py-[0.36rem] sm:py-[0.55rem] text-right font-mono text-[11px] text-parchment tnum sm:px-5 sm:text-sm">
                        {row.creditLabel}
                      </td>
                      <td className="px-3 py-[0.36rem] sm:py-[0.55rem] text-right font-mono text-[11px] text-parchment/80 tnum sm:px-5 sm:text-sm">
                        {row.soFarLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr
                  className="credit-row border-t border-gold/35 bg-gold/[0.06]"
                  data-landed={matured ? "true" : "false"}
                  data-fresh={matured ? "true" : "false"}
                >
                  <th
                    scope="row"
                    className="px-3 py-2.5 text-left sm:py-3 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-parchment sm:px-5"
                  >
                    Maturity
                    <span className="ml-2.5 normal-case tracking-normal text-dust">{maturityDate}</span>
                  </th>
                  <td className="credit-amount px-3 py-2.5 text-right sm:py-3 font-mono text-[11px] text-parchment tnum sm:px-5 sm:text-sm">
                    {principalLabel}
                  </td>
                  <td className="px-3 py-2.5 text-right sm:py-3 font-mono text-[11px] font-medium text-parchment tnum sm:px-5 sm:text-sm">
                    {maturityLabel}
                  </td>
                </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
