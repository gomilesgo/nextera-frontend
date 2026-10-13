"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatPaise } from "@nextera/contracts";
import { cx } from "@/lib/cx";
import { getLedger, getServerLedger, setLedger, subscribeLedger } from "./ledgerStore";

export type Stop = { id: string; label: string };

type Props = {
  stops: Stop[];
  months: number;
  monthlyPaise: number;
  principalLabel: string;
  creditDates: string[];
  maturityDate: string;
};

export function Instrument({ stops, months, monthlyPaise, principalLabel, creditDates, maturityDate }: Props) {
  const ledger = useSyncExternalStore(subscribeLedger, getLedger, getServerLedger);
  const [firing, setFiring] = useState(false);
  const previous = useRef(0);

  useEffect(() => {
    const previousPadding = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "var(--bar-h)";
    return () => {
      document.body.style.paddingBottom = previousPadding;
    };
  }, []);

  useEffect(() => {
    const sections = stops
      .map((stop) => document.getElementById(stop.id))
      .filter((node): node is HTMLElement => node !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setLedger({ act: entry.target.id });
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [stops]);

  useEffect(() => {
    if (ledger.credits <= previous.current) {
      previous.current = ledger.credits;
      return;
    }
    previous.current = ledger.credits;
    setFiring(true);
    const timer = window.setTimeout(() => setFiring(false), 520);
    return () => window.clearTimeout(timer);
  }, [ledger.credits]);

  const credited = formatPaise(monthlyPaise * ledger.credits);
  const nextDate = creditDates[Math.min(ledger.credits, creditDates.length - 1)] ?? maturityDate;
  const monthly = formatPaise(monthlyPaise);

  return (
    <aside className="instrument" data-firing={firing ? "true" : "false"} aria-label="Worked example, running total">
      <div className="mx-auto flex h-full max-w-[1320px] items-center gap-4 px-4 sm:px-6 md:px-8">
        <nav aria-label="Sections" className="hidden min-w-0 shrink items-center gap-4 lg:flex">
          {stops.map((stop) => (
            <a
              key={stop.id}
              href={`#${stop.id}`}
              data-on={ledger.act === stop.id ? "true" : "false"}
              className="instrument-jump whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] hover:text-parchment"
            >
              {stop.label}
            </a>
          ))}
        </nav>

        <p className="min-w-0 flex-1 truncate font-mono text-[10.5px] tracking-[0.04em] text-dust sm:text-xs lg:text-center">
          {ledger.matured ? (
            <>
              <span className="text-parchment">Executed</span>
              <span className="hidden sm:inline">
                {" · "}
                {months} of {months} credits
              </span>
              {" · principal "}
              <span className="instrument-amount text-gold tnum">{principalLabel}</span>
              {" returned "}
              {maturityDate}
            </>
          ) : ledger.credits === 0 ? (
            <>
              <span className="hidden text-parchment sm:inline">Standing order</span>
              <span className="hidden sm:inline">{" · "}</span>
              First credit {nextDate}
              {" · "}
              <span className="instrument-amount text-parchment tnum">{monthly}</span>
            </>
          ) : (
            <>
              <span className="text-parchment">
                Credit {String(ledger.credits).padStart(2, "0")} of {months}
              </span>
              {" · "}
              {nextDate}
              {" · "}
              <span className="instrument-amount tnum">{monthly}</span>
            </>
          )}
        </p>

        <p className="shrink-0 whitespace-nowrap font-mono text-[10.5px] tracking-[0.04em] text-dust sm:text-xs">
          <span className="hidden sm:inline">Credited </span>
          <span className={cx("tnum", ledger.credits > 0 ? "text-gold" : "text-parchment/60")}>{credited}</span>
        </p>
      </div>
    </aside>
  );
}
